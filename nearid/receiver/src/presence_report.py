import hmac
import hashlib
import time
from dataclasses import dataclass, asdict
from typing import Any, AsyncIterator, Dict

from .ble_scanner import BlePacketV2, scan_hnnp_packets
from .config_loader import load_receiver_config


@dataclass
class PresenceReport:
    org_id: str
    receiver_id: str
    timestamp: int
    time_slot: int
    version: int
    flags: int
    token_prefix: str  # hex
    mac: str  # hex
    signature: str  # hex

    def to_json(self) -> Dict[str, Any]:
        return asdict(self)


def _encode_uint32_be(value: int) -> bytes:
    if value < 0 or value > 0xFFFFFFFF:
        raise ValueError(f"encode_uint32_be: value out of range: {value}")
    return value.to_bytes(4, byteorder="big", signed=False)


def build_presence_report(
    packet: BlePacketV2,
    org_id: str,
    receiver_id: str,
    receiver_secret: str,
    timestamp: int | None = None,
) -> PresenceReport:
    """
    Build a PresenceReport and compute receiver signature according to spec:

    signature = HMAC-SHA256(receiver_secret,
                 org_id || receiver_id || encode_uint32(time_slot) ||
                 token_prefix || encode_uint32(timestamp))
    """
    ts = timestamp if timestamp is not None else int(time.time())

    key = receiver_secret.encode("utf-8")
    msg = (
        org_id.encode("utf-8")
        + receiver_id.encode("utf-8")
        + _encode_uint32_be(packet.time_slot)
        + packet.token_prefix
        + _encode_uint32_be(ts)
    )

    mac = hmac.new(key, msg, hashlib.sha256).hexdigest()

    return PresenceReport(
        org_id=org_id,
        receiver_id=receiver_id,
        timestamp=ts,
        time_slot=packet.time_slot,
        version=packet.version,
        flags=packet.flags,
        token_prefix=packet.token_prefix.hex(),
        mac=packet.mac.hex(),
        signature=mac,
    )


async def scan_presence_reports() -> AsyncIterator[PresenceReport]:
    """
    High-level helper that:

    - Scans BLE for HNNP v2 packets (structurally valid, de-duplicated).
    - Builds a signed presence report for each accepted packet.

    Configuration is loaded via load_receiver_config() from environment and optional config file.
    """
    cfg = load_receiver_config()

    async for packet in scan_hnnp_packets():
        report = build_presence_report(
            packet=packet,
            org_id=cfg.org_id,
            receiver_id=cfg.receiver_id,
            receiver_secret=cfg.receiver_secret,
        )
        yield report
