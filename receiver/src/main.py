import asyncio
import logging

from sender import run_sender
from health import run_health_server


async def _run_all() -> None:
    await asyncio.gather(run_sender(), run_health_server())


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    asyncio.run(_run_all())


if __name__ == "__main__":
    main()

