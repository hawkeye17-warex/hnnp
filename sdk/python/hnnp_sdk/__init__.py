from __future__ import annotations

import hashlib
import hmac
from typing import Union


def verify_webhook_signature(
    secret: Union[str, bytes],
    timestamp: Union[str, int],
    raw_body: bytes,
    signature_hex: str,
) -> bool:
    """
    Verify an HNNP webhook signature using HMAC-SHA256.

    Spec (v2, Section 10.3):

      X-HNNP-Signature = hex(HMAC-SHA256(webhook_secret, timestamp || raw_body))

    Args:
        secret: webhook_secret for the org (string or bytes).
        timestamp: X-HNNP-Timestamp header value (string or int).
        raw_body: raw HTTP request body as bytes (exactly as received over the wire).
        signature_hex: X-HNNP-Signature header value (hex string).

    Returns:
        True if the signature is valid, False otherwise.
    """
    key = secret.encode("utf-8") if isinstance(secret, str) else bytes(secret)
    ts_str = str(timestamp)

    msg = ts_str.encode("utf-8") + raw_body
    expected = hmac.new(key, msg, hashlib.sha256).hexdigest()

    # Use constant-time comparison.
    try:
        return hmac.compare_digest(expected, signature_hex)
    except Exception:
        return False


def verify_hnnp_webhook(
    raw_body: bytes,
    signature: str,
    timestamp: Union[str, int],
    webhook_secret: Union[str, bytes],
) -> bool:
    """
    Backwards-compatible helper that forwards to verify_webhook_signature.

    This matches the older README signature:

        verify_hnnp_webhook(raw_body, signature, timestamp, webhook_secret)
    """
    return verify_webhook_signature(
        secret=webhook_secret,
        timestamp=timestamp,
        raw_body=raw_body,
        signature_hex=signature,
    )


__all__ = [
    "verify_webhook_signature",
    "verify_hnnp_webhook",
]

