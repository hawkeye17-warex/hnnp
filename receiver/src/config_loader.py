import logging
import os
import sys
from dataclasses import dataclass
from typing import Optional


@dataclass
class ReceiverConfig:
    org_id: str
    receiver_id: str
    receiver_secret: str
    api_base_url: str
    max_retry_attempts: int
    max_queue_size: int


def _load_env_file(path: str) -> None:
    """
    Load a simple KEY=VALUE env file without overriding existing environment variables.
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if not stripped or stripped.startswith("#"):
                    continue
                if "=" not in stripped:
                    continue
                key, value = stripped.split("=", 1)
                key = key.strip()
                value = value.strip()
                if key and key not in os.environ:
                    os.environ[key] = value
    except FileNotFoundError:
        # Config file is optional.
        return


def load_receiver_config(config_path: Optional[str] = None) -> ReceiverConfig:
    """
    Load receiver configuration from environment variables and an optional config file.

    Precedence:
      - Environment variables
      - Config file (receiver.env by default, or HNNP_CONFIG_PATH)

    Supported variables:
      - HNNP_ORG_ID or ORG_ID
      - HNNP_RECEIVER_ID or RECEIVER_ID
      - HNNP_RECEIVER_SECRET or RECEIVER_SECRET
      - HNNP_API_BASE_URL or API_BASE_URL or HNNP_BACKEND_URL

    On validation error, this function logs a clear error and exits the process
    with status code 1 (instead of raising an exception).
    """
    logger = logging.getLogger("hnnp.receiver.config")

    if config_path is None:
        config_path = os.environ.get("HNNP_CONFIG_PATH", "receiver.env")

    # Seed environment from config file without overriding explicit env.
    _load_env_file(config_path)

    org_id = os.environ.get("HNNP_ORG_ID") or os.environ.get("ORG_ID") or ""
    receiver_id = os.environ.get("HNNP_RECEIVER_ID") or os.environ.get("RECEIVER_ID") or ""
    receiver_secret = (
        os.environ.get("HNNP_RECEIVER_SECRET") or os.environ.get("RECEIVER_SECRET") or ""
    )
    api_base_url = (
        os.environ.get("HNNP_API_BASE_URL")
        or os.environ.get("API_BASE_URL")
        or os.environ.get("HNNP_BACKEND_URL")
        or ""
    )

    missing = []
    if not org_id:
        missing.append("HNNP_ORG_ID (or ORG_ID)")
    if not receiver_id:
        missing.append("HNNP_RECEIVER_ID (or RECEIVER_ID)")
    if not receiver_secret:
        missing.append("HNNP_RECEIVER_SECRET (or RECEIVER_SECRET)")
    if not api_base_url:
        missing.append("HNNP_API_BASE_URL (or API_BASE_URL/HNNP_BACKEND_URL)")

    if missing:
        logger.error(
            "Receiver configuration invalid; missing required settings: %s",
            ", ".join(missing),
        )
        sys.exit(1)

    # Optional tuning parameters for retry/queue behaviour.
    # These are intentionally forgiving: invalid values fall back to defaults.
    def _parse_positive_int(name: str, raw: Optional[str], default: int) -> int:
        if raw is None or raw == "":
            return default
        try:
            value = int(raw)
        except ValueError:
            logger.warning("Invalid %s=%r; using default %d", name, raw, default)
            return default
        if value <= 0:
            logger.warning("%s must be positive; using default %d", name, default)
            return default
        return value

    max_retry_attempts = _parse_positive_int(
        "MAX_RETRY_ATTEMPTS",
        os.environ.get("HNNP_MAX_RETRY_ATTEMPTS") or os.environ.get("MAX_RETRY_ATTEMPTS"),
        10,
    )
    max_queue_size = _parse_positive_int(
        "MAX_QUEUE_SIZE",
        os.environ.get("HNNP_MAX_QUEUE_SIZE") or os.environ.get("MAX_QUEUE_SIZE"),
        1000,
    )

    return ReceiverConfig(
        org_id=org_id,
        receiver_id=receiver_id,
        receiver_secret=receiver_secret,
        api_base_url=api_base_url.rstrip("/"),
        max_retry_attempts=max_retry_attempts,
        max_queue_size=max_queue_size,
    )
