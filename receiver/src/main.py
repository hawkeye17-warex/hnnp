import asyncio
import logging

from config_loader import load_receiver_config
from sender import run_sender
from health_server import run_health_server


async def _run_all() -> None:
    await asyncio.gather(run_sender(), run_health_server())


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )

    cfg = load_receiver_config()
    logging.getLogger("hnnp.receiver.startup").info(
        "Starting HNNP receiver org_id=%s receiver_id=%s api_base_url=%s",
        cfg.org_id,
        cfg.receiver_id,
        cfg.api_base_url,
    )

    asyncio.run(_run_all())


if __name__ == "__main__":
    main()
