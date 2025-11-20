# HNNP Protocol

This directory contains the canonical Human Near-Network Protocol (HNNP) v2 specification.

- `spec.md` is the single source of truth for:
  - BLE packet formats (v2 symmetric design, version byte 0x02)
  - Token and MAC generation (device_secret, device_auth_key, token_prefix, 8-byte mac)
  - HMAC constructions and keys
  - Receiver report formats and signatures
  - Cloud API endpoints, request/response schemas
  - Webhook payloads and signing rules

All implementations in `backend/`, `receiver/`, `mobile/`, `sdk/`, and `docs/` MUST conform exactly to `spec.md`.
