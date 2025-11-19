import asyncio
from dataclasses import dataclass
from typing import AsyncIterator, Optional

try:
    from bleak import BleakScanner  # type: ignore
except ImportError:  # pragma: no cover - bleak not installed in all environments
    BleakScanner = None  # type: ignore


HNNP_SERVICE_UUID = "0000f0e0-0000-1000-8000-00805f9b34fb"
PAYLOAD_LENGTH_BYTES = 30


@dataclass
class BlePacketV2:
    version: int
    flags: int
    time_slot: int
    token_prefix: bytes
    mac: bytes


def _parse_hnnp_payload(payload: bytes) -> Optional[BlePacketV2]:
    if len(payload) != PAYLOAD_LENGTH_BYTES:
        return None

    version = payload[0]
    flags = payload[1]

    if version != 0x02:
        return None

    time_slot = int.from_bytes(payload[2:6], byteorder="big", signed=False)
    token_prefix = payload[6:22]
    mac = payload[22:30]

    return BlePacketV2(
        version=version,
        flags=flags,
        time_slot=time_slot,
        token_prefix=token_prefix,
        mac=mac,
    )


async def scan_hnnp_packets() -> AsyncIterator[BlePacketV2]:
    """
    Continuous BLE scan loop for HNNP packets.

    - Filters for HNNP service UUID.
    - Filters by payload length = 30 bytes.
    - Decodes candidate packets into BlePacketV2.

    Yields BlePacketV2 instances for further processing (e.g., presence reports).
    """
    if BleakScanner is None:
        raise RuntimeError("bleak is not installed; BLE scanning is unavailable")

    while True:
        devices = await BleakScanner.discover()
        for d in devices:
            # manufacturer_data and service_data layouts are library dependent.
            # Here we check service_data for the HNNP service UUID.
            service_data = getattr(d, "metadata", {}).get("service_data") or {}

            payload = None
            if HNNP_SERVICE_UUID in service_data:
                payload = service_data[HNNP_SERVICE_UUID]

            if payload is None:
                continue

            packet = _parse_hnnp_payload(payload)
            if packet is not None:
                yield packet

        await asyncio.sleep(1.0)

