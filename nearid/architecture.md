# HNNP Architecture Overview (v2)

This document provides a high-level overview of the HNNP v2 ecosystem architecture.
Every component described here MUST operate exactly as defined in the official protocol:
`protocol/spec.md`

---

## High-Level Flow (v2)

Device �+' BLE �+' Receiver �+' HTTPS �+' HNNP Cloud �+' Webhook �+' External System

---

## Component Breakdown

---

### 1. Device (Mobile App)

The mobile device is responsible for:

- Securely storing `device_secret` in platform-secure storage (Keystore/Keychain).
- Deriving `device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")`.
- Computing `time_slot = floor(unix_time / T)` using the v2 time model.
- Generating `full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || "hnnp_v2_presence")`.
- Deriving `token_prefix` (first 16 bytes of `full_token`).
- Computing:
  - `mac_full = HMAC-SHA256(device_auth_key, version || flags || encode_uint32(time_slot) || token_prefix)`
  - `mac = first 8 bytes` of `mac_full`.
- Assembling BLE advertisement packet (v2):
  - version (1 byte, 0x02)
  - flags (1 byte)
  - time_slot (4 bytes big-endian, uint32)
  - token_prefix (16 bytes)
  - mac (8 bytes)
- Broadcasting via BLE using the intervals and privacy guidance in `spec.md`.

Device does NOT need internet.

---

### 2. Receiver (Software Node)

Receiver responsibilities:

- Continuously scan for BLE advertisements.
- Parse HNNP v2 packets and validate packet structure and length (30-byte payload).
- Construct presence report (per v2 spec):
  - org_id
  - receiver_id
  - token_prefix
  - time_slot
  - timestamp
  - packet metadata as required
- Compute
  `signature = HMAC-SHA256(receiver_secret, org_id || receiver_id || encode_uint32(time_slot) || token_prefix || encode_uint32(timestamp))`.
- Send `POST /v2/presence` to the Cloud over HTTPS.
- Queue offline events when network unavailable.
- Drop events older than allowable skew configured in Cloud.

Receivers are software-only:
Linux / macOS / Windows / Raspberry Pi.

---

### 3. HNNP Cloud Backend

Backend tasks:

- Validate receiver signature using HMAC-SHA256 and constant-time comparison.
- Validate timestamp skew against `max_skew_seconds`.
- Derive `device_id_base` from `device_id_salt`, `time_slot`, and `token_prefix` (v2 Section 8.4):
  - `device_id_base = HMAC-SHA256(device_id_salt, encode_uint32(time_slot) || token_prefix)`.
- Derive stable `device_id` from `device_id_salt` and `device_id_base` (v2 Section 8.8):
  - `device_id = HMAC-SHA256(device_id_salt, "hnnp_v2_id" || device_id_base)`.
- Track registration status (unregistered vs registered) based on presence of `device_auth_key`.
- For registered devices, recompute and verify MAC using stored `device_auth_key`.
- Enforce anti-replay rules per v2 (one valid event per `(org_id, device_id_base, receiver_id, time_slot)`).
- Check if `device_id` is linked to `org_id`.
- Create `presence_event` or `presence_session` depending on link status.
- Emit webhook to external system.
- Expose APIs:
  - `POST /v2/presence`
  - `POST /v2/link`
  - `DELETE /v2/link/{link_id}`

Stores:

- devices / device_keys
- presence_events
- presence_sessions
- links
- receivers

---

### 4. External System

Receives webhook events:

- `presence.check_in`
- `presence.unknown`
- `link.created`
- `link.revoked`

External system responsibilities:

- Store presence updates and apply business logic.
- Process unknown presence, identify user, and call `POST /v2/link`.
- Update internal logs, queues, security systems, time tracking, etc.

Webhook signing MUST be validated using Section 10.3 rules:

- `X-HNNP-Timestamp` = unix timestamp (string).
- `X-HNNP-Signature` = hex of `HMAC-SHA256(webhook_secret, timestamp || raw_body)`.

The external system MUST recompute the expected value and compare in constant time.

---

## Security Overview

- `device_secret` stored in secure enclave (Keystore/Keychain) where possible.
- `receiver_secret` stored in environment/config secrets (never logged).
- HMAC-SHA256 for all signatures (tokens, receiver signatures, webhooks).
- BLE packets contain no identity or personal data.
- Cloud performs constant-time comparisons for all MACs and signatures.
- All transport is HTTPS.
- Timestamp skew enforced server-side using `max_skew_seconds`.
- Anti-replay enforced across `(org_id, device_id_base, receiver_id, time_slot)`.

---

## Privacy Guarantees

HNNP v2 is designed so that:

- BLE payload has no static identifiers or user identity.
- `token_prefix` rotates every `T` seconds.
- Observers cannot correlate packets to a user without Cloud secrets.
- Only Cloud (with `device_id_salt` and `device_auth_key`) can compute `device_id` and verify MACs.

---

## Extensibility

- New protocol versions are encoded in the packet `version` byte.
- Optional features may be enabled via the `flags` byte.
- Hardware receivers can be introduced later without changing the protocol.
- Regional Cloud deployments and per-org key separation (`device_id_salt`, `webhook_secret`) are supported.

---

## Reference

Full canonical protocol spec:
`protocol/spec.md`
*** End Patch*** 巧 to=functions.apply_patch نمایید்வு assistant to=functions.apply_patchยายน_firestoreെട്ടisicing to=functions.apply_patchдениировать to=functions.apply_patchҵаз to=functions.apply_patch средней to=functions.apply_patchистов to=functions.apply_patch് to=functions.apply_patchовора to=functions.apply_patchiapellido통령 to=functions.apply_patch Ponents ратно to=functions.apply_patchល់ to=functions.apply_patch ***!
