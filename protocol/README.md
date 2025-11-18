# HNNP Protocol

This directory contains the canonical Human Near-Node Protocol (HNNP) specification.

- `spec.md` is the single source of truth for:
  - BLE packet formats
  - Token and MAC generation
  - HMAC constructions and keys
  - Receiver report formats and signatures
  - Cloud API endpoints, request/response schemas
  - Webhook payloads and signing rules

All implementations in `backend/`, `receiver/`, `mobile/`, `sdk/`, and `docs/` MUST conform exactly to `spec.md`.
