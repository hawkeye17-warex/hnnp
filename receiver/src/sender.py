import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import List, Optional

try:
    import aiohttp  # type: ignore
except ImportError:  # pragma: no cover - aiohttp may not be installed everywhere
    aiohttp = None  # type: ignore

from .presence_report import PresenceReport, scan_presence_reports


logger = logging.getLogger("hnnp.receiver.sender")


@dataclass
class QueuedReport:
    report: PresenceReport
    first_seen: int
    attempts: int
    next_retry_at: float


def _get_base_url() -> str:
    base_url = (
        os.environ.get("HNNP_API_BASE_URL")
        or os.environ.get("API_BASE_URL")
        or os.environ.get("HNNP_BACKEND_URL")
        or ""
    )
    if not base_url:
        raise RuntimeError("HNNP_API_BASE_URL (or API_BASE_URL/HNNP_BACKEND_URL) must be set")
    return base_url.rstrip("/")


def _get_max_skew_seconds() -> int:
    raw = os.environ.get("MAX_SKEW_SECONDS", "120")
    try:
        value = int(raw)
    except ValueError:
        value = 120
    return max(value, 0)


async def _post_presence(
    session: "aiohttp.ClientSession",
    base_url: str,
    report: PresenceReport,
) -> int:
    """
    Send a single presence report to Cloud via POST /v2/presence.

    Returns the HTTP status code. Caller decides how to handle failures.
    """
    url = f"{base_url}/v2/presence"
    async with session.post(url, json=report.to_json(), timeout=10) as resp:
        return resp.status


async def run_sender() -> None:
    """
    High-level receiver loop:

    - Consumes signed PresenceReport instances from scan_presence_reports().
    - Sends them to Cloud via POST /v2/presence.
    - On network/5xx failures, enqueues reports in-memory and retries with backoff.
    - Drops events older than max_skew_seconds.

    No secrets or full MACs are logged; only high-level status.
    """
    if aiohttp is None:
        raise RuntimeError("aiohttp is not installed; HTTP sending is unavailable")

    base_url = _get_base_url()
    max_skew_seconds = _get_max_skew_seconds()

    queue: List[QueuedReport] = []

    async with aiohttp.ClientSession() as session:  # type: ignore[arg-type]
        async def handle_report(report: PresenceReport) -> None:
            now = int(time.time())

            # Drop events older than allowed skew.
            if now - report.timestamp > max_skew_seconds:
                logger.info(
                    "Dropping stale presence event (age=%ss, time_slot=%s)",
                    now - report.timestamp,
                    report.time_slot,
                )
                return

            status: Optional[int] = None
            try:
                status = await _post_presence(session, base_url, report)
            except Exception as exc:
                # Network-level failure: queue for retry.
                logger.warning(
                    "Network error sending presence (time_slot=%s): %s",
                    report.time_slot,
                    exc,
                )
                _enqueue_report(queue, report, now)
                return

            if 200 <= status < 300:
                # Success.
                logger.debug(
                    "Presence accepted (status=%s, time_slot=%s)",
                    status,
                    report.time_slot,
                )
                return

            if 500 <= status < 600:
                # Server-side transient error: enqueue for retry.
                logger.warning(
                    "Server error sending presence (status=%s, time_slot=%s); enqueueing for retry",
                    status,
                    report.time_slot,
                )
                _enqueue_report(queue, report, now)
                return

            # 4xx and other non-retriable errors: drop.
            logger.info(
                "Dropping presence due to non-retriable status (status=%s, time_slot=%s)",
                status,
                report.time_slot,
            )

        async def retry_loop() -> None:
            while True:
                now = time.time()
                for item in list(queue):
                    if item.next_retry_at > now:
                        continue

                    # Drop if too old.
                    if now - item.report.timestamp > max_skew_seconds:
                        logger.info(
                            "Dropping queued stale presence event (age=%ss, time_slot=%s)",
                            int(now - item.report.timestamp),
                            item.report.time_slot,
                        )
                        queue.remove(item)
                        continue

                    status: Optional[int] = None
                    try:
                        status = await _post_presence(session, base_url, item.report)
                    except Exception as exc:
                        logger.warning(
                            "Retry network error (attempt=%s, time_slot=%s): %s",
                            item.attempts,
                            item.report.time_slot,
                            exc,
                        )
                        _schedule_next_retry(item)
                        continue

                    if 200 <= status < 300:
                        logger.debug(
                            "Queued presence accepted after retry (attempt=%s, time_slot=%s)",
                            item.attempts,
                            item.report.time_slot,
                        )
                        queue.remove(item)
                        continue

                    if 500 <= status < 600:
                        logger.warning(
                            "Retry server error (status=%s, attempt=%s, time_slot=%s)",
                            status,
                            item.attempts,
                            item.report.time_slot,
                        )
                        _schedule_next_retry(item)
                        continue

                    # Non-retriable error.
                    logger.info(
                        "Dropping queued presence due to non-retriable status (status=%s, time_slot=%s)",
                        status,
                        item.report.time_slot,
                    )
                    queue.remove(item)

                await asyncio.sleep(1.0)

        async def consume_reports() -> None:
            async for report in scan_presence_reports():
                await handle_report(report)

        await asyncio.gather(consume_reports(), retry_loop())


def _enqueue_report(queue: List[QueuedReport], report: PresenceReport, now: int) -> None:
    queue.append(
        QueuedReport(
            report=report,
            first_seen=now,
            attempts=1,
            next_retry_at=now + 1,
        )
    )


def _schedule_next_retry(item: QueuedReport) -> None:
    item.attempts += 1
    # Exponential backoff capped at 60 seconds.
    delay = min(60, 2 ** min(item.attempts, 6))
    item.next_retry_at = time.time() + delay

