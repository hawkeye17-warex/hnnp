# HNNP Architecture Overview

This document provides a high-level overview of the entire HNNP ecosystem architecture.
Every component described here MUST operate exactly as defined in the official protocol:
hnnp/protocol/spec.md

---

## High-Level Flow

Device → BLE → Receiver → HTTPS → HNNP Cloud → Webhook → External System

---

## Component Breakdown

---

### 1. Device (Mobile App)

The mobile device is responsible for:

- Securely storing device_secret
- Computing time_slot = floor(unix_time / T)
- Generating full_token via HMAC(device_secret, time_slot || "presence")
- Deriving token_prefix (16 bytes)
- Computing mac (4 bytes)
- Assembling BLE advertisement packet:
  version (1 byte)
  flags (1 byte)
  time_slot (4 bytes big endian)
  token_prefix (16 bytes)
  mac (4 bytes)
- Broadcasting via BLE

Device does NOT need internet.

---

### 2. Receiver (Software Node)

Receiver responsibilities:

- Continuously scan for BLE advertisements
- Parse HNNP packets
- Validate packet structure and length
- Construct presence report:
  org_id
  receiver_id
  token_prefix
  time_slot
  timestamp
- Compute signature = HMAC(receiver_secret, packet_fields)
- Send POST /v1/presence to the Cloud
- Queue offline events when network unavailable
- Drop events older than allowable skew

Receivers are software-only:
Linux / macOS / Windows / Raspberry Pi

---

### 3. HNNP Cloud Backend

Backend tasks:

- Validate receiver signature
- Validate timestamp skew
- Derive device_id from token_prefix + time_slot using device_id_salt
- Check if device_id is linked to org_id
- Create presence_event or presence_session
- Emit webhook to external system
- Expose APIs:
  POST /v1/presence
  GET /v1/presence/events
  POST /v1/link
  DELETE /v1/link

Stores:

- devices
- presence_events
- presence_sessions
- links
- receivers

---

### 4. External System

Receives webhook events:

- presence.check_in
- presence.unknown
- link.created
- link.revoked

External system responsibilities:

- Store presence updates
- Process unknown → identify user → call POST /v1/link
- Update internal logs, queues, security systems, time tracking, etc.

Webhook signing MUST be validated using Section 8.3 rules.

---

## Security Overview

- Device_secret stored in secure enclave (Keystore/Keychain)
- Receiver_secret stored in environment variables (never logged)
- HMAC-SHA256 for all signatures
- BLE packets contain no identity or personal data
- Cloud performs constant-time signature comparison
- All transport is HTTPS
- Timestamp skew enforced server-side

---

## Privacy Guarantees

HNNP is designed so that:

- BLE payload has no static identifiers
- token_prefix rotates every T seconds
- Observers cannot correlate packets to a user
- Only Cloud can compute device_id using server-side salt

---

## Extensibility

- New protocol versions encoded in packet version byte
- Optional features enabled via flags byte
- Hardware receivers can be introduced later
- Regional Cloud deployments supported

---

## Reference

Full canonical protocol spec:
hnnp/protocol/spec.md
