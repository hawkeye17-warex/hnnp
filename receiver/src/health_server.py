import os

from aiohttp import web

from sender import get_queue_size  # type: ignore

try:
  # Optional import; if not available, last_scan_at will be None.
  from sender import get_last_scan_at  # type: ignore
except ImportError:  # pragma: no cover
  def get_last_scan_at() -> int | None:  # type: ignore[override]
    return None


async def handle_health(_request: web.Request) -> web.Response:
    """
    Simple health/status endpoint for the receiver.

    Returns JSON:
      - status: "ok"
      - queued_reports: current number of queued presence reports
      - last_scan_at: unix timestamp (seconds) of the last scanned presence, or null
    """
    data = {
        "status": "ok",
        "queued_reports": get_queue_size(),
        "last_scan_at": get_last_scan_at(),
    }
    return web.json_response(data)


async def run_health_server() -> None:
    """
    Start a lightweight HTTP server exposing /health for monitoring.

    Configuration (optional):
      - HNNP_HEALTH_HOST (default "127.0.0.1")
      - HNNP_HEALTH_PORT (default "8081")
    """
    host = os.environ.get("HNNP_HEALTH_HOST", "127.0.0.1")
    port = int(os.environ.get("HNNP_HEALTH_PORT", "8081"))

    app = web.Application()
    app.router.add_get("/health", handle_health)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

