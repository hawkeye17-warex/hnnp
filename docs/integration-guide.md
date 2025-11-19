# HNNP v2 Integration Guide

This guide explains how to build new HNNP v2 clients (devices) and receivers that interoperate with the Cloud backend defined in `protocol/spec.md`.

It is **descriptive**, not normative – the canonical source of truth remains:

- `protocol/spec.md` (HNNP Protocol Specification v3 – canonical v2 behavior)

Read this guide together with the spec; any conflicts MUST be resolved in favor of `spec.md`.

---

## 1. Time model and 15‑second token window

HNNP v2 is built around a fixed 15‑second token window:

- Let `T = 15` seconds.
- Let `unix_time` be the current UTC time in seconds.
- **time_slot** is:

  ```text
  time_slot = floor(unix_time / 15)
  ```

This rule is applied consistently:

- **Device**: uses `time_slot` to derive tokens and BLE packet MACs.
- **Receiver**: validates that decoded packets use a reasonable `time_slot` close to its own clock.
- **Cloud**: recomputes `server_slot = floor(server_time / 15)` and enforces drift and anti‑replay.

Skew and drift:

- Cloud enforces `max_skew_seconds` ?ecommended 120s):  
  `|server_time - timestamp| > max_skew_seconds` ?� reject.
- Cloud and receiver both treat `time_slot` in **15‑second windows** and allow a small drift window (±1 slot) to tolerate clock differences.

**Key point:** all security decisions are made in terms of the 15‑second `time_slot`, not BLE packet timing.

---

## 2. BLE advertising interval vs token rotation

Two time scales are intentionally independent:

1. **Token rotation**
   - Every 15 seconds, the device:
     - Recomputes `time_slot = floor(unix_time / 15)`.
     - Derives a new `full_token`, `token_prefix`, and packet MAC for that slot.
   - Tokens MUST be updated immediately when the device crosses into a new `time_slot`.

2. **BLE advertising interval**
   - The 30‑byte HNNP v2 payload is broadcast as a BLE advertisement:
     - Recommended interval: roughly 300–500 ms in active mode.
     - Background or low‑power modes can use 1000–2000 ms or pause advertising.
   - During one `time_slot` (15 seconds), the device may emit the **same token_prefix** tens of times (e.g., 30–50 packets).

Why they are independent:

- BLE advertising cadence is for **visibility and reliability**, not security.
- All replay and anti‑replay guarantees come from:
  - The 15‑second `time_slot` window.
  - Cryptographic MACs and signatures.
  - Cloud’s anti‑replay rules.
- Cloud MUST NOT treat BLE advertising frequency as a security parameter.

Practical implementation rules:

- Device:
  - Maintain a scheduler that:
    - Tracks current `time_slot` based on `unix_time`.
    - Regenerates tokens immediately on `time_slot` change.
    - Keeps a separate repeating timer for BLE broadcasts (e.g., every 300–500 ms).
- Receiver:
  - Treat multiple packets with the same `(time_slot, token_prefix)` as repeated broadcasts of the **same** token, not new tokens.

---

## 3. Device implementation checklist

### 3.1 Secrets and keys

From `spec.md` (Sections 3 and 5):

- Generate a 32‑byte **device_secret** at install time using a CSPRNG.
  - Store only in OS secure storage:
    - Android: Keystore / EncryptedSharedPreferences.
    - iOS: Keychain / Secure Enclave when available.
  - Never transmit or log `device_secret`.

- Derive **device_auth_key**:

  ```text
  device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")
  ```

  - This key is used for:
    - Token generation (full_token, token_prefix, MAC).
    - Registration blob for linking.

### 3.2 Token derivation per time_slot

For each `time_slot`:

1. Compute:

   ```text
   full_token = HMAC-SHA256(device_auth_key,
                            encode_uint32(time_slot) || "hnnp_v2_presence")
   ```

2. Derive:

   ```text
   token_prefix = first 16 bytes of full_token   (128 bits)
   ```

### 3.3 Packet MAC

To authenticate the BLE packet structure:

```text
mac_full = HMAC-SHA256(device_auth_key,
                       version || flags || encode_uint32(time_slot) || token_prefix)

mac = first 8 bytes of mac_full   (64 bits)
```

Where:

- `version` is `0x02` (1 byte).
- `flags` is a 1‑byte bitfield; for v2 base spec it SHOULD be `0x00`.
- `encode_uint32` uses big‑endian encoding.

### 3.4 BLE packet layout (30 bytes)

The 30‑byte HNNP v2 payload is:

- `version`: 1 byte (`0x02`).
- `flags`: 1 byte.
- `time_slot`: 4 bytes (uint32, big‑endian).
- `token_prefix`: 16 bytes.
- `mac`: 8 bytes.

Total: 1 + 1 + 4 + 16 + 8 = 30 bytes.

Placement:

- Put this payload in:
  - Manufacturer Data, or
  - Service Data with a pre‑agreed service UUID.

Privacy:

- Do **not** include any static IDs, user identifiers, or debug strings in the BLE payload.

### 3.5 Registration blob for onboarding

During onboarding/linking, the device exposes a **registration_blob**:

```text
registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2")
                    || random device_local_id
```

Notes:

- `device_local_id` is a random per‑device value used only for onboarding flow.
- The blob is typically transported via:
  - QR code.
  - Deep link.
  - Other secure OOB channel.
- The exact transport format is non‑normative as long as:
  - The blob remains confidential.
  - It cannot be trivially forged or guessed.

---

## 4. Receiver implementation checklist

### 4.1 Configuration

Receiver needs:

- `org_id`
- `receiver_id`
- `receiver_secret` (32 random bytes, securely provisioned)
- `api_base_url` (Cloud URL, HTTPS only)

These are typically loaded from:

- Environment variables, or
- A configuration file protected on disk.

#### 4.1.1 Receiver setup and authentication

At a minimum, each receiver process must be provisioned with:

- `HNNP_ORG_ID` (or `ORG_ID`)
  - The org_id this receiver belongs to.
- `HNNP_RECEIVER_ID` (or `RECEIVER_ID`)
  - A stable identifier for this specific receiver.
  - Multiple receivers for the same org share the same `org_id` but have distinct `receiver_id` values.
- `HNNP_RECEIVER_SECRET` (or `RECEIVER_SECRET`)
  - 32-byte random secret, unique per receiver_id.
  - Used only on receivers and Cloud; MUST NOT be present on mobile devices.
- `HNNP_API_BASE_URL` (or `API_BASE_URL` / `HNNP_BACKEND_URL`)
  - Base URL of the Cloud backend (HTTPS).

Authentication model:

- Each `(org_id, receiver_id)` pair has an associated `receiver_secret` stored securely on the receiver and in Cloud.
- Receiver signatures are computed per spec:

  ```text
  signature = HMAC-SHA256(receiver_secret,
               org_id || receiver_id || encode_uint32(time_slot) ||
               token_prefix || encode_uint32(timestamp))
  ```

- Cloud recomputes `expected_signature` using its copy of `receiver_secret` and rejects any report where the constant-time comparison fails.

Multi-receiver deployments:

- An org may deploy many receivers:
  - All share the same `org_id`.
  - Each has its own `receiver_id` and `receiver_secret`.
- Cloud stores a `receivers` data model keyed by `(org_id, receiver_id)` so it can:
  - Validate signatures per receiver.
  - Track per-receiver health and presence patterns (for impossible-movement and wormhole heuristics).


### 4.2 BLE scanning and structural validation

Receiver continuously scans for BLE advertisements:

1. Filter by:
   - HNNP service UUID or manufacturer signature.
   - Payload length exactly 30 bytes.
2. Parse:
   - `version` (1 byte)
   - `flags` (1 byte)
   - `time_slot` (4 bytes, big‑endian)
   - `token_prefix` (16 bytes)
   - `mac` (8 bytes)
3. Apply **local filters**:
   - `version == 0x02` (unless explicitly supporting multiple versions).
   - `time_slot` not unreasonably far in the future:
     - E.g., interpret as seconds ≈ `time_slot * 15` and reject values more than 10 years ahead.
   - Reject packets where both:
     - `token_prefix` is all zeros, and
     - `mac` is all zeros.

### 4.3 Time_slot validation and drift

Receiver should:

- Compute local:

  ```text
  current_slot = floor(now / 15)
  ```

- Accept packets where:

  ```text
  |time_slot - current_slot| <= max_drift_slots
  ```

  with `max_drift_slots` usually `1`.

Packets outside this tolerance are treated as invalid and dropped.

### 4.4 Duplicate suppression (receiver side)

Receivers see many BLE packets with the same `(token_prefix, time_slot)` in a window. To reduce Cloud load:

- Maintain an in‑memory cache keyed by `(token_prefix, time_slot)`.
- Store the last‑seen timestamp for each key.
- When a new packet arrives:
  - If the same key was seen within the last `duplicate_suppress_seconds` (default 5s), **ignore** it.
  - Otherwise:
    - Update the last‑seen timestamp.
    - Treat it as a new presence candidate.

This ensures:

- At most one presence report per device per `time_slot` per receiver in typical conditions.
- Rush‑hour bursts are smoothed out before hitting Cloud.

### 4.5 Presence report construction

For each accepted BLE packet:

1. Set:

   ```text
   timestamp = current UTC unix time (seconds)
   ```

2. Compute receiver signature:

   ```text
   signature = HMAC-SHA256(receiver_secret,
                org_id || receiver_id || encode_uint32(time_slot) ||
                token_prefix || encode_uint32(timestamp))
   ```

3. Build JSON presence report:

   ```json
   {
     "org_id": "<org>",
     "receiver_id": "<receiver>",
     "timestamp": 1234567890,
     "time_slot": 82304459,
     "version": 2,
     "flags": 0,
     "token_prefix": "<token_prefix_hex_or_base64>",
     "mac": "<mac_hex_or_base64>",
     "signature": "<receiver_signature_hex>"
   }
   ```

### 4.6 Sending reports to Cloud

- Endpoint:

  ```text
  POST /v2/presence
  ```

- Behavior:
  - Use HTTPS.
  - On network or 5xx errors:
    - Queue reports locally (in memory or on disk).
    - Retry with backoff.
  - Drop events older than `max_skew_seconds` ?.g., 120s).

Secrets:

- Do **not** log:
  - `receiver_secret`
  - Full MACs for production traffic
  - Any other long‑term secrets

---

## 5. Cloud verification and anti‑replay

Cloud receives `POST /v2/presence` and processes as follows.

### 5.1 Input validation

Check presence report has all required fields:

- `org_id`, `receiver_id`, `timestamp`, `time_slot`
- `version`, `flags`
- `token_prefix`, `mac`
- `signature`

Reject malformed or missing fields with HTTP 400.

### 5.2 Receiver lookup and signature verification

1. Lookup `receiver_secret` for `(org_id, receiver_id)`.
   - If none found ⇒ HTTP 401/404.
2. Recompute:

   ```text
   expected_signature = HMAC-SHA256(receiver_secret,
                                    org_id || receiver_id || encode_uint32(time_slot) ||
                                    token_prefix || encode_uint32(timestamp))
   ```

3. Use constant‑time comparison; if mismatch ⇒ HTTP 401.

### 5.3 Timestamp skew and time_slot drift

1. Let `server_time = now()`.
   - If `|server_time - timestamp| > max_skew_seconds` ?� HTTP 400.
2. Compute:

   ```text
   server_slot = floor(server_time / 15)
   ```

   - If `|time_slot - server_slot| > max_drift_slots` ⇒ HTTP 400.

### 5.4 Anonymous device fingerprint

Cloud derives a preliminary anonymous identifier:

```text
device_id_base = HMAC-SHA256(device_id_salt,
                             encode_uint32(time_slot) || token_prefix)
```

Where:

- `device_id_salt` is a per‑org secret stored only in Cloud.

This `device_id_base` identifies a “cryptographic device” without requiring onboarding.

### 5.5 Registered vs unregistered devices

For each `(org_id, device_id_base)` Cloud tracks:

- **unregistered**:
  - No `device_auth_key` registered yet.
  - Cloud cannot verify packet MAC.
  - Events are treated as low‑trust, anonymous presence.
- **registered**:
  - Device has provided `device_auth_key` via onboarding.
  - Cloud can fully verify BLE packet MAC.

Cloud also derives a stable **device_id** for business logic:

```text
device_id = HMAC-SHA256(device_id_salt, "hnnp_v2_id" || device_id_base)
```

All internal linking and history use `device_id`.

### 5.6 MAC verification for registered devices

If device is registered:

1. Fetch `device_auth_key` for this `device_id` (or `device_id_base` depending on storage model).
2. Recompute:

   ```text
   mac_full = HMAC-SHA256(device_auth_key,
                version || flags || encode_uint32(time_slot) || token_prefix)
   expected_mac = first 8 bytes of mac_full
   ```

3. Constant‑time compare `expected_mac` with reported `mac`:
   - On mismatch, mark as suspicious and either:
     - Reject outright (hardened mode), or
     - Accept with `suspicious` flag for investigation.

If device is unregistered:

- Cloud MAY skip MAC verification (no key yet) and accept events as anonymous presence.

### 5.7 Anti‑replay rules (Cloud)

Cloud enforces:

- For each `(org_id, device_id_base, receiver_id, time_slot)`:
  - First valid event is accepted as normal.
  - Subsequent events in the same `time_slot` from the same receiver:
    - May be rejected, or
    - Stored but marked as duplicates.

A sane default:

- Reject duplicates where the new `timestamp` is less than 5 seconds after the previous one.
- Optionally accept events with a greater timestamp difference as retries, flagged as suspicious.

Cloud should also detect:

- Same `(org_id, device_id_base)` appearing at multiple receivers in an “impossible” time window (impossible movement / wormhole).

### 5.8 Presence sessions and responses

For each accepted presence:

1. Store `presence_event`:
   - `event_id`
   - `org_id`
   - `receiver_id`
   - `device_id`
   - `timestamp`
   - `time_slot`
   - `version`
   - `link_id` (nullable)
   - `presence_session_id` (nullable)
   - `suspicious_flags` (bitmask or JSON)

2. Resolve link:
   - If an active link exists for `(org_id, device_id)`:
     - Classify event as **linked**.
     - No presence_session needed.
   - If no link:
     - Classify as **unknown**.
     - Create or update a `presence_session` for `(org_id, device_id)` with:
       - `presence_session_id`
       - `first_seen_at`
       - `last_seen_at`
       - `resolved_at` (nullable until linked)

3. Respond:
   - If linked:

     ```json
     {
       "status": "accepted",
       "linked": true,
       "event_id": "...",
       "link_id": "...",
       "user_ref": "..."
     }
     ```

   - If unknown:

     ```json
     {
       "status": "accepted",
       "linked": false,
       "event_id": "...",
       "presence_session_id": "..."
     }
     ```

---

## 6. Onboarding, linking, and verifying presence

This section ties device, receiver, and Cloud together.

### 6.1 Onboarding a new device

1. **Device install:**
   - Generate `device_secret` (32 bytes) and store securely.
   - Derive `device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")`.

2. **Registration blob:**
   - Compute:

     ```text
     registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2")
                         || device_local_id
     ```

   - Encode in a compact form (e.g., base64url) for transport.

3. **Present blob to external system:**
   - The device exposes the blob via:
     - QR code,
     - Deep link, or
     - Other secure channel.
   - An external system (e.g., portal or admin UI) reads it and associates it with a user account.

### 6.2 Linking via Cloud API

When an unknown presence is observed:

1. Cloud has created a `presence_session` for `(org_id, device_id)` and returned `presence_session_id` in `/v2/presence` responses.
2. An external system collects:
   - `org_id`
   - `presence_session_id`
   - `user_ref` (external user identifier)
   - `registration_blob` from the device (recommended)
3. It calls:

   ```text
   POST /v2/link
   ```

   with body:

   ```json
   {
     "org_id": "<org>",
     "presence_session_id": "<session_id>",
     "user_ref": "<user_ref>",
     "registration_blob": "<blob>" // optional but recommended
   }
   ```

4. Cloud behavior:
   - Resolve `presence_session_id` ⇒ `(org_id, device_id)`.
   - If `registration_blob` is provided:
     - Validate it using `device_auth_key` derivation rules.
     - Store `device_auth_key` for this `device_id` (registration).
   - Create a `link`:
     - `link_id`, `org_id`, `device_id`, `user_ref`, `created_at`.
   - Mark `presence_session` as resolved (set `resolved_at`).
   - Emit a `link.created` webhook.
   - Return:

     ```json
     {
       "status": "linked",
       "link_id": "...",
       "user_ref": "...",
       "device_id": "..."
     }
     ```

### 6.3 Verifying presence for linked devices

Once linked:

1. Device continues broadcasting tokens with the same rules (15‑second windows, 30‑byte packets).
2. Receiver continues scanning and sending `/v2/presence` reports.
3. Cloud:
   - Derives `device_id_base` and `device_id` for each report.
   - Finds:
     - Stored `device_auth_key` for MAC verification.
     - Active `link` for `(org_id, device_id)`.
   - Verifies MAC; applies anti‑replay and anomaly detection.
   - Stores a `presence_event` and emits:
     - `presence.check_in` webhook for linked events.
     - `presence.unknown` webhook for unknown events.

Webhook signing:

- Each webhook includes:
  - `X-HNNP-Timestamp`: Unix timestamp (string).
  - `X-HNNP-Signature`: hex of `HMAC-SHA256(webhook_secret, timestamp || raw_body)`.

External systems:

- For each webhook:
  - Recompute `expected = HMAC-SHA256(webhook_secret, timestamp || raw_body)`.
  - Constant‑time compare with the header.
  - Optionally reject if timestamp is too old.

---

## 7. Building new clients and receivers

If you are implementing a new client or receiver using only this guide and `spec.md`:

- **Device:**
  - Implement:
    - Secure `device_secret` storage.
    - `device_auth_key` derivation.
    - 15‑second `time_slot` calculation.
    - Token and MAC derivation exactly as specified.
    - 30‑byte BLE payload with the correct layout and version.
    - Optional registration_blob for onboarding.

- **Receiver:**
  - Implement:
    - BLE scan for HNNP packets with 30‑byte payloads.
    - Structural validation and time_slot drift checks.
    - Duplicate suppression by `(token_prefix, time_slot)` with a ≥5s window.
    - Presence report construction and receiver signature.
    - HTTPS POST `/v2/presence` with retry and local queue.

- **Cloud integration:**
  - Implement:
    - `/v2/presence`, `/v2/link`, `/v2/link/{link_id}` as in `spec.md`.
    - Receiver signature verification, timestamp skew, and time_slot drift checks.
    - Device fingerprinting, registration, MAC verification, anti‑replay, and presence sessions.
    - Webhook sending with HMAC signing and replay‑safe timestamp checks.

Always cross‑check field names, encodings, and HMAC formulas against `protocol/spec.md` to ensure your implementation is fully compliant with HNNP v2.
---

## 8. Linking & revocation (practical guide)

This section makes the linking and revocation flows concrete for engineers integrating with `/v2/link` and `/v2/link/{link_id}`.

### 8.1 Field meanings in linking

- `org_id`
  - Tenant / customer identifier.
  - All presence, links, and webhooks are scoped by `org_id`.
- `presence_session_id`
  - Stable identifier for an **unknown device** within a given org.
  - Created by Cloud when presence events arrive for a device with no active link.
  - Returned in `/v2/presence` responses when `linked: false`.
- `user_ref`
  - External system’s user identifier (employee ID, account ID, etc.).
  - Cloud treats `user_ref` as an opaque string; it is not parsed or validated beyond presence.
- `registration_blob`
  - One-time onboarding blob emitted by the device:

    ```text
    registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2")
                        || device_local_id
    ```

  - Encoded (e.g., base64url) and delivered to the backend via QR code / deep link.
  - Cloud uses it (together with other onboarding context) to validate the device and store `device_auth_key` for that device.

### 8.2 Creating a link (POST /v2/link)

**Request**

```http
POST /v2/link
Content-Type: application/json
```

```json
{
  "org_id": "acme-corp",
  "presence_session_id": "psess_12345",
  "user_ref": "user_98765",
  "registration_blob": "eyJ0eXAiOiJ..."
}
```

- `org_id`:
  - Org that owns the receiver and Cloud API.
- `presence_session_id`:
  - Identifies the unknown device to be linked, as seen in previous `/v2/presence` responses (`linked: false`).
- `user_ref`:
  - External identifier for the human being.
- `registration_blob` (recommended):
  - Proof that this particular physical device controls `device_auth_key` derived from its `device_secret`.

**Cloud behavior (summary, per spec):**

1. Resolve `presence_session_id` to `(org_id, device_id)`.
2. If `registration_blob` is present:
   - Validate it using the device-side derivation rules for `device_auth_key` and `registration_blob`.
   - Store `device_auth_key` for this `device_id` in the `device_keys` data model.
   - Mark the device as **registered**.
3. Create a `link`:
   - `link_id`, `org_id`, `device_id`, `user_ref`, `created_at`.
4. Mark the `presence_session` as resolved (`resolved_at` set).
5. Emit a `link.created` webhook to the org’s webhook endpoint.

**Response**

```json
{
  "status": "linked",
  "link_id": "link_abc123",
  "user_ref": "user_98765",
  "device_id": "dev_4f9c..."
}
```

- `device_id`:
  - Cloud’s stable internal identifier derived from `device_id_base` and `device_id_salt`.

### 8.3 Revoking a link (DELETE /v2/link/{link_id})

When a device is lost, compromised, or no longer allowed to represent a user, the external system should revoke the link.

**Request**

```http
DELETE /v2/link/link_abc123
Content-Type: application/json
```

```json
{
  "org_id": "acme-corp"
}
```

- `link_abc123`:
  - Path parameter identifying the specific link to revoke.
- `org_id`:
  - Ensures the operation is scoped to the correct tenant (multi-tenant safety).

**Cloud behavior (summary, per spec):**

1. Locate the active link `(org_id, link_id)`.
2. Mark it as revoked (set `revoked_at`).
3. Future presence events for that `device_id` will no longer resolve to this link.
4. Emit a `link.revoked` webhook.

**Response**

```json
{
  "status": "revoked",
  "link_id": "link_abc123",
  "revoked_at": 1732046400000
}
```

### 8.4 Multi-device scenarios

Because `device_id` is derived from per-device cryptographic material, each physical device has its own `device_id` and can be linked or revoked independently. Typical flows:

- **User logs in on a second phone**
  - The second phone runs the same device flow:
    - Generates its own `device_secret` and `device_auth_key`.
    - Produces a new `registration_blob`.
  - The external system calls `/v2/link` for the new device’s `presence_session_id` and the same `user_ref`.
  - Cloud creates a **second link** for the same `user_ref` but a different `device_id`.
  - Both devices now produce `presence.check_in` events for that user (distinguishable by `device_id`).

- **Device is lost and link is revoked**
  - External system identifies the affected `link_id` (e.g., by listing links for a `user_ref`).
  - Calls `DELETE /v2/link/{link_id}` for that device.
  - Cloud stops resolving new presence events from that `device_id` as linked:
    - Events can be treated as unknown presence (new `presence_session`).
    - Or ignored by the external system based on policy.

- **Same user later links a new device**
  - The new physical device follows the normal onboarding path:
    - New `device_secret`, new `device_auth_key`, new `registration_blob`.
  - External system calls `/v2/link` with:
    - The new device’s `presence_session_id`.
    - The same `user_ref`.
    - The new `registration_blob`.
  - Cloud creates a new link for the new `device_id`. The old (revoked) link remains revoked; it is not reused.

These flows ensure:

- Device-level secrets (`device_secret`, `device_auth_key`) never move between devices.
- A compromised or lost device can be removed from the trust graph without affecting other devices for the same user.
- Users can safely migrate to new devices while preserving history per `device_id` and `user_ref`.

---

## 9. Clock & drift considerations

HNNP’s security model assumes that devices, receivers, and Cloud all use reasonably accurate clocks, with limited drift.

- **Devices**
  - Should rely on the OS clock (UTC) and avoid maintaining their own custom time sources.
  - Compute `time_slot = floor(unix_time / 15)` based on that clock.
  - If a device’s clock drifts significantly, its tokens may fall outside the Cloud’s allowed drift window and be rejected.

- **Receivers**
  - Use their OS clock to validate BLE `time_slot` locally and to set `timestamp` in presence reports.
  - Should be NTP-synchronized in production; modest drift (±1 time_slot) is tolerated.
  - The sender queue (`receiver/src/sender.py`) drops reports whose age exceeds `max_skew_seconds` ?efault 120s) before sending to Cloud.

- **Cloud**
  - Uses its own `server_time` to enforce both `max_skew_seconds` ?d the slot drift window:
    - Rejects if `|server_time - timestamp| > max_skew_seconds`.
    - Computes `server_slot = floor(server_time / 15)` and rejects if `|time_slot - server_slot| > MAX_DRIFT_SLOTS` (default 1).
  - This ensures that even if network delivery is slightly delayed or clocks are slightly skewed, events within a small time window still verify, while stale or badly skewed events are rejected.

---

## 10. Linking & revocation examples

This section gives concrete JSON examples and an end-to-end sequence, complementing the normative behavior described earlier.

### 10.1 Device registration (non-normative example)

Device registration uses the `registration_blob` defined in the spec. Transport is non-normative, but a typical QR or deep-link payload might look like:

```json
{
  "type": "hnnp_registration_v2",
  "org_id": "acme-corp",
  "registration_blob": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "issued_at": 1732046400
}
```

Notes:

- Only the `registration_blob` content is defined by the spec:
  - `registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2") || device_local_id`.
- Fields like `type`, `org_id`, `issued_at` are implementation details for the external system.
- The external system reads this payload, extracts `registration_blob`, and later sends it to Cloud via `/v2/link`.

### 10.2 Linking a device (POST /v2/link)

This is the canonical Cloud API call that both **links** and effectively **registers** a device with the Cloud.

```http
POST /v2/link
Content-Type: application/json
```

```json
{
  "org_id": "acme-corp",
  "presence_session_id": "psess_12345",
  "user_ref": "user_98765",
  "registration_blob": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:

```json
{
  "status": "linked",
  "link_id": "link_abc123",
  "user_ref": "user_98765",
  "device_id": "dev_4f9c..."
}
```

### 10.3 Revoking a device (DELETE /v2/link/{link_id})

```http
DELETE /v2/link/link_abc123
Content-Type: application/json
```

```json
{
  "org_id": "acme-corp"
}
```

Response:

```json
{
  "status": "revoked",
  "link_id": "link_abc123",
  "revoked_at": 1732046400000
}
```

### 10.4 Sequence: anonymous → linked

Text-based sequence diagram showing the normal flow from anonymous presence to linked presence events:

```text
Device          Receiver            Cloud                  External System
  |               |                  |                              |
  | BLE packets   |                  |                              |
  |-------------->|                  |                              |
  |               | POST /v2/presence (unknown)                     |
  |               |-----------------------------------------------> |
  |               |                  | presence.unknown webhook     |
  |               |                  |--------------------------->  |
  |               |                  |  (includes presence_session_id)
  |               |                  |                              |
  |  registration_blob (QR / link)   |                              |
  |-------------------------------------------------------------->  |
  |               |                  |                              |
  |               |                  | POST /v2/link                |
  |               |                  | (org_id, presence_session_id,|
  |               |                  |  user_ref, registration_blob)|
  |               |                  |<----------------------------- |
  |               |                  | 200 linked (link_id, device_id)
  |               |                  |                              |
  |               |                  | link.created webhook         |
  |               |                  |--------------------------->  |
  |               |                  |                              |
  | BLE packets   |                  |                              |
  |-------------->|                  |                              |
  |               | POST /v2/presence (linked)                      |
  |               |-----------------------------------------------> |
  |               |                  | presence.check_in webhook    |
  |               |                  |--------------------------->  |
```
