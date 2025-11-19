import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class ReceiverConfig:
    org_id: str
    receiver_id: str
    receiver_secret: str
    api_base_url: str


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
    """
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

    if not org_id:
        raise RuntimeError("HNNP_ORG_ID (or ORG_ID) must be set")
    if not receiver_id:
        raise RuntimeError("HNNP_RECEIVER_ID (or RECEIVER_ID) must be set")
    if not receiver_secret:
        raise RuntimeError("HNNP_RECEIVER_SECRET (or RECEIVER_SECRET) must be set")
    if not api_base_url:
        raise RuntimeError("HNNP_API_BASE_URL (or API_BASE_URL/HNNP_BACKEND_URL) must be set")

    return ReceiverConfig(
        org_id=org_id,
        receiver_id=receiver_id,
        receiver_secret=receiver_secret,
        api_base_url=api_base_url.rstrip("/"),
    )

