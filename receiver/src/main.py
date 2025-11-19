import asyncio
import logging

from sender import run_sender


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    asyncio.run(run_sender())


if __name__ == "__main__":
    main()

