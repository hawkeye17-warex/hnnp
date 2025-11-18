# HNNP Protocol Specification v2 (Option A – Symmetric, Fast, Privacy-Preserving)

This is the canonical v2 specification for the Human Near-Network Protocol (HNNP) using a symmetric-key design optimized for:

- Very low battery usage on devices
- No internet requirement on devices
- Strong anonymity (no identity in BLE)
- Cryptographic authenticity for linked devices
- Strict anti-replay rules
- Defense against naive spoofing and basic wormhole attacks
- Reasonable resistance to reverse engineering

All implementations MUST strictly follow this specification. Any deviation (field sizes, crypto primitives, verification rules) is non-compliant.

---

# 0. THREAT MODEL AND GOALS

---

### 0.1 Threat Model (simplified)

We assume:

- Attackers can:
  - Sniff all BLE traffic.
  - Replay BLE packets.
  - Run their own receivers.
  - Decompile apps (reverse engineer code), but NOT trivially extract secrets from hardware-backed storage.
- Stronger attackers:
  - May root/jailbreak their own device and obtain that device’s secrets.
  - CANNOT compromise the HNNP Cloud (device_id_salt, org secrets).
  - CANNOT compromise all devices at once.

We design HNNP v2 to:

- Make it cryptographically hard to:
  - Forge valid tokens for a linked device without its keys.
  - Mass-spoof presence for many users.
- Preserve privacy:
  - No stable identifiers in air.
  - No user identity in BLE.
- Allow:
  - Devices to remain fully offline.
  - Zero interaction at check-in time (one-time onboarding allowed).
- Mitigate (not fully eliminate) wormhole/teleport attacks:
  - Make them detectable and operationally expensive.

### 0.2 Goals

- Anonymous rotating tokens over BLE.
- Cryptographically verifiable presence for linked devices.
- Strong anti-replay rules.
- Strong key management and secret separation.
- Clear upgrade path for future versions.

### 0.3 Non-Goals

- Perfect elimination of all wormhole attacks (no passive system can do this fully).
- GPS-level location assurance.
- Identity/KYC; external systems handle user identity.

---

# 1. TERMINOLOGY

---

- Device: Mobile app instance on a phone that broadcasts HNNP tokens.
- Receiver: Node (software/hardware) that listens for BLE, signs reports, and forwards to Cloud.
- HNNP Cloud: Backend that verifies presence, derives device_id, manages links, and emits webhooks.
- Org: Tenant / customer using HNNP.
- user_ref: External system user identifier (employee ID, customer ID, etc.).
- device_id: Internal identifier for a device as seen by HNNP Cloud.
- Link: Binding between (org_id, device_id) and user_ref.
- Presence Event: Single processed presence detection.
- Presence Session: A grouping of presence events for an unknown device before linking.
- Webhook: HTTP POST from Cloud to an external system to notify of events.

---

# 2. CRYPTOGRAPHIC PRIMITIVES

---

All cryptography MUST use:

- HMAC-SHA256 for all MACs and signatures.
- Big-endian for integer encodings.
- UTF-8 for strings.
- Constant-time comparisons for all signature and MAC checks.

No other hash/MAC algorithms are allowed in v2.

---

# 3. SECRETS AND KEYS

---

### 3.1 Device Secret (device_secret)

Each device generates at install time:

- device_secret: 32 random bytes (cryptographically secure RNG).

Rules:

- Generated locally, stored only on device, in OS secure storage:
  - Android: Keystore / EncryptedSharedPreferences.
  - iOS: Keychain / Secure Enclave when available.
- Never transmitted over network or stored in logs.
- Never shared directly with Cloud.

### 3.2 Device Auth Key (device_auth_key)

To allow Cloud to verify tokens for linked devices, we derive a verifiable key:

- device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")

This key:

- Remains on device until onboarding/linking.
- During one-time onboarding, the device can expose a derived public registration blob:

  - registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2") plus a random device_local_id.
- External system sends registration_blob to Cloud when creating a link.
- Cloud stores device_auth_key (or a derived variant) associated with device_id.
- After this, Cloud can verify tokens for that device.

Details of onboarding transport (QR, NFC, deep link, etc.) are non-normative but MUST be secure.

### 3.3 Receiver Secret (receiver_secret)

Each receiver has:

- receiver_secret: 32 random bytes.

Rules:

- Stored securely on receiver (config, env, or secure module).
- Distributed via secure provisioning from Cloud.
- Used by receiver to sign presence reports.

### 3.4 Device ID Salt (device_id_salt)

For each org, the Cloud stores:

- device_id_salt: 32 random bytes (Cloud-only).

Used to derive device_id from tokens.

### 3.5 Webhook Secret (webhook_secret)

Per org:

- webhook_secret: secret used to sign outgoing webhooks.

Stored in Cloud secret storage / KMS.

---

# 4. TIME MODEL

---

### 4.1 Time Slot

Let:

- T = token rotation window in seconds. Recommended: T = 15.

For a device:

- unix_time = current UTC timestamp in seconds.
- time_slot = floor(unix_time / T).

#### 4.2 Skew

Cloud enforces:

- max_skew_seconds = 120 (recommended).

If |server_time − timestamp| > max_skew_seconds → event rejected.

---

# 5. TOKEN GENERATION (DEVICE SIDE, v2)

---

v2 ensures that Cloud can cryptographically verify tokens for linked devices using device_auth_key.

For each time_slot:

Inputs:

- device_auth_key (derived from device_secret).
- time_slot (uint32 big-endian).
- context string "hnnp_v2_presence".

### 5.1 Full Token

full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || "hnnp_v2_presence")

### 5.2 Token Prefix

token_prefix = first 16 bytes of full_token  (128 bits)

### 5.3 Packet MAC (authenticator)

To authenticate the packet structure per device:

mac_full = HMAC-SHA256(device_auth_key,
                       version || flags || encode_uint32(time_slot) || token_prefix)

mac = first 8 bytes of mac_full  (64 bits)

Note:

- We now use 8 bytes (64 bits) instead of 4 bytes for mac to make forgery probability extremely small.
- Cloud can recompute mac for linked devices using stored device_auth_key and reject invalid packets.

---

# 6. BLE PACKET STRUCTURE (v2)

---

BLE payload fields:

- version: 1 byte
- flags: 1 byte
- time_slot: 4 bytes (uint32, big-endian)
- token_prefix: 16 bytes
- mac: 8 bytes

Total length = 1 + 1 + 4 + 16 + 8 = 30 bytes.

### 6.1 Version

- version = 0x02 (HNNP v2 symmetric design).
- v1 implementations used 0x01; these are now legacy.

### 6.2 Flags

- 1-byte bitfield for future options.
- For v2 base spec: SHOULD be 0x00.
- Bits MAY be used for future features (e.g., low-power hints, local beacon binding).

### 6.3 Placement in BLE Advertise Payload

Device MUST place this 30-byte payload in:

- Manufacturer Data field, or
- Service Data field with a pre-agreed service UUID.

BLE packet MUST NOT include:

- Any personal identifiers.
- Static device names tied to users.
- Debug strings that leak environment.

Advertising characteristics:

- Non-connectable advertisement recommended.
- Interval around 200–500 ms (implementation dependent).

---

# 7. RECEIVER BEHAVIOR (v2)

---

### 7.1 Configuration

Receiver is configured with:

- org_id
- receiver_id
- receiver_secret
- api_base_url (Cloud endpoint)

All communication to Cloud MUST be over HTTPS.

### 7.2 BLE Scanning

Receiver continuously scans for:

- Advertisements matching the HNNP service/Manufacturer signature.
- Payload length exactly 30 bytes.

For each candidate packet:

- Parse:
  - version (1 byte)
  - flags (1 byte)
  - time_slot (4 bytes)
  - token_prefix (16 bytes)
  - mac (8 bytes)

### 7.3 Local Filtering

Receiver SHOULD:

- Reject packets with:
  - version not equal to 0x02 (unless explicitly supporting multiple versions).
  - obviously invalid time_slot (e.g., far future like > 10 years).
  - zero token_prefix + zero mac (noise).

Receiver CANNOT verify mac (only Cloud can), so it forwards all candidate packets that pass basic structural checks.

### 7.4 Presence Report Construction

For each valid packet:

- timestamp = current UTC Unix time (seconds).

Compute receiver signature:

signature = HMAC-SHA256(receiver_secret,
                        org_id || receiver_id || encode_uint32(time_slot) ||
                        token_prefix || encode_uint32(timestamp))

Presence report:

- org_id
- receiver_id
- timestamp
- time_slot
- version
- flags
- token_prefix (e.g., hex or base64)
- mac (e.g., hex or base64)
- signature

### 7.5 Sending Presence Reports

Receiver sends:

- POST /v2/presence

Body is JSON containing the fields above.

On network failure:

- Queue events locally, with retry.
- Drop events older than max_skew_seconds.

---

8. CLOUD VERIFICATION AND PRESENCE PROCESSING (v2)

---

On POST /v2/presence:

8.1 Input Validation

Check presence report has:

- org_id
- receiver_id
- timestamp
- time_slot
- version
- token_prefix
- mac
- signature

If missing or malformed → reject (HTTP 400).

8.2 Receiver Lookup and Signature Verification

Find receiver_secret for (org_id, receiver_id).

If none → reject (HTTP 401/404).

Recompute:

expected_signature = HMAC-SHA256(receiver_secret,
                                 org_id || receiver_id || encode_uint32(time_slot) ||
                                 token_prefix || encode_uint32(timestamp))

If constant_time_compare(expected_signature, signature) fails → reject (401).

8.3 Timestamp Skew Check

Let server_time = current UTC Unix time.

If abs(server_time − timestamp) > max_skew_seconds → reject (400).

8.4 Derive Preliminary Device ID (Anonymous)

Compute an anonymous device fingerprint that does NOT rely on device_auth_key:

device_id_base = HMAC-SHA256(device_id_salt,
                             encode_uint32(time_slot) || token_prefix)

Use full 32 bytes or a consistent truncation (e.g., 16–32 bytes) as device_id_base.

This identifies a “cryptographic device” without requiring onboarding.

8.5 Link and Registration Status

For (org_id, device_id_base), Cloud maintains state:

- unregistered: device has never provided device_auth_key (no cryptographic proof of origin).
- registered: device has provided device_auth_key via onboarding, and Cloud has stored device_auth_key for this device_id.

8.6 MAC Verification for Registered Devices

If state is registered:

- Fetch device_auth_key for device_id_base.
- Recompute:

  mac_full = HMAC-SHA256(device_auth_key,
  version || flags || encode_uint32(time_slot) || token_prefix)

  expected_mac = first 8 bytes of mac_full.
- If constant_time_compare(expected_mac, mac) fails:

  - Mark event as suspicious and either:
    - reject outright (recommended), or
    - accept with a `suspicious: true` flag (for debugging).
  - Recommended: reject for fully hardened mode.

If state is unregistered:

- Cloud MAY:
  - skip mac verification (no key yet).
  - treat events as low-trust anonymous presence.
- Once device is linked and registration finishes, future events are fully verifiable.

8.7 Anti-Replay Rules

Cloud MUST enforce:

- For each (org_id, device_id_base, receiver_id, time_slot):
  - Only the first valid event is marked as normal.
  - Subsequent events in the same time_slot from the same receiver may be:
    - rejected, or
    - stored but flagged as duplicates.

Cloud SHOULD also detect and flag:

- Same (org_id, device_id_base) appearing at multiple receivers far apart within an impossible time window.

8.8 Device ID for Business Logic

To maintain stable identity across time_slots:

device_id = HMAC-SHA256(device_id_salt, "hnnp_v2_id" || device_id_base)

This internal device_id is used for all linking and presence history internally.

8.9 Link Resolution

If there is an active link:

- (org_id, device_id) → (link_id, user_ref)

Then:

- Event classified as linked presence.check_in.
- presence_session is not needed.

If there is no active link:

- Event classified as unknown presence.
- Cloud creates or updates a presence_session for (org_id, device_id) with:
  - presence_session_id
  - first_seen_at
  - last_seen_at

8.10 Event Persistence

For each accepted presence:

Store presence_event:

- event_id
- org_id
- receiver_id
- device_id
- timestamp
- time_slot
- version
- link_id (nullable)
- presence_session_id (nullable)
- suspicious flags (if any)

8.11 Response to Receiver

On success, Cloud returns HTTP 200 with:

If linked:

- status: "accepted"
- linked: true
- event_id
- link_id
- user_ref

If unknown:

- status: "accepted"
- linked: false
- event_id
- presence_session_id

---

9. LINK MANAGEMENT (v2)

---

9.1 Creating a Link (POST /v2/link)

Request body:

- org_id
- presence_session_id
- user_ref
- registration_blob (optional but recommended for full security)

Cloud behavior:

1) Resolve presence_session_id → device_id.
2) If registration_blob present:
   - Validate registration_blob using device_auth_key derivation rules.
   - Store device_auth_key for device_id.
   - Mark device state as registered.
3) Create link:
   - link_id
   - org_id
   - device_id
   - user_ref
   - created_at
   - active = true
4) Emit webhook: link.created.

Response:

- status: "linked"
- link_id
- user_ref
- device_id

9.2 Revoking a Link (DELETE /v2/link/{link_id})

Cloud behavior:

- Mark link as revoked with revoked_at.
- Future presence events will no longer resolve to that link.
- Emit webhook: link.revoked.

Response:

- status: "revoked"
- link_id
- revoked_at

---

10. WEBHOOKS (v2)

---

10.1 Event Types

- presence.check_in
- presence.unknown
- link.created
- link.revoked

10.2 Payload Examples

presence.check_in:

- type: "presence.check_in"
- event_id
- org_id
- device_id
- link_id
- user_ref
- receiver_id
- timestamp
- suspicious (optional boolean for anomalies)

presence.unknown:

- type: "presence.unknown"
- event_id
- org_id
- device_id
- presence_session_id
- receiver_id
- timestamp

10.3 Webhook Signing

Headers:

- X-HNNP-Timestamp: unix timestamp (string).
- X-HNNP-Signature: hex of HMAC-SHA256(webhook_secret, timestamp || raw_body).

External system MUST:

- Recompute expected = HMAC-SHA256(webhook_secret, timestamp || raw_body).
- Constant-time compare with X-HNNP-Signature.
- Optionally reject if timestamp is too old.

---

11. DATA MODEL (CONCEPTUAL)

---

Cloud SHOULD maintain:

devices:

- device_id
- device_id_base
- org_id (or global)
- first_seen_at
- registered (bool)

device_keys (for registered devices):

- org_id
- device_id
- device_auth_key (encrypted at rest)
- registration_at

receivers:

- org_id
- receiver_id
- receiver_secret (encrypted)
- created_at
- last_seen_at

links:

- link_id
- org_id
- device_id
- user_ref
- created_at
- revoked_at (nullable)

presence_sessions:

- presence_session_id
- org_id
- device_id
- first_seen_at
- last_seen_at
- resolved_at (nullable)

presence_events:

- event_id
- org_id
- device_id
- receiver_id
- timestamp
- time_slot
- link_id (nullable)
- presence_session_id (nullable)
- suspicious_flags (bitmask or JSON)

---

12. SECURITY REQUIREMENTS (v2)

---

12.1 Secret Management

- device_secret: only on device, hardware-backed where possible.
- device_auth_key (Cloud side): stored encrypted (e.g., KMS-managed).
- receiver_secret: stored as a secret; never logged.
- device_id_salt: stored only in Cloud secret manager.
- webhook_secret: per-org, secret-managed.

12.2 Constant-Time Checks

All checks on:

- receiver signature
- mac
- webhook signatures

MUST use constant-time comparison.

12.3 Logging Restrictions

MUST NOT log:

- device_secret
- device_auth_key
- receiver_secret
- device_id_salt
- webhook_secret
- mac values in full (for production; truncated logs for debugging only, and never with real traffic).

MAY log:

- event_id
- org_id
- receiver_id
- high-level stats
- suspicious flags

12.4 Anti-Replay

- Enforce max_skew_seconds.
- Reject or flag duplicates of (org_id, device_id, receiver_id, time_slot).
- Detect impossible movement patterns for device_id across receivers.

12.5 Wormhole Mitigation (Recommended)

To reduce wormhole attacks (remote replay in real-time), HNNP v2 recommends:

- Optional local_beacon_nonce broadcast by receiver (e.g., via another BLE service).
- Device includes local_beacon_nonce in full_token derivation when available:

  full_token = HMAC-SHA256(device_auth_key,
  encode_uint32(time_slot) || local_beacon_nonce || "hnnp_v2_presence")
- Cloud checks that reported receiver is consistent with the nonces that device could have seen.
- This makes simple remote replay harder unless attacker relays nonces in real-time.

Exact local_beacon_nonce mechanism is non-normative but MUST maintain anonymity (no IDs in nonce).

---

13. PRIVACY AND ANONYMITY

---

13.1 Broadcast Anonymity

BLE packets in v2 contain:

- version
- flags
- time_slot
- token_prefix (128-bit pseudorandom)
- mac (64-bit pseudorandom from device_auth_key)

No user identity, no static ID, no phone number, no patient ID.

Observers cannot:

- Directly link packets over long time without access to Cloud keys.
- Recover device_secret or device_auth_key.

13.2 Cloud-Only Identity Mapping

Only Cloud (with device_id_salt and device_auth_key) can:

- Derive internal device_id.
- Confirm MAC correctness.
- Map presence to a link (user_ref) via external system.

13.3 Cross-Org Isolation

If implemented per-org:

- Each org has its own device_id_salt and device_auth_key namespace.
- device_id is not globally shared across orgs.
- No org can see another org’s links or presence, by design.

---

14. VERSIONING

---

- version byte = 0x02 for this spec.
- v1 (0x01) is legacy and SHOULD be deprecated over time.
- Any future breaking changes MUST increment version to 0x03 and define new rules.

Receivers MAY:

- Support both v1 and v2 in transition, but MUST clearly distinguish them.

---

15. COMPLIANCE AND TESTING

---

v2-compliant implementations MUST pass:

- Token generation vectors:
  - Given device_auth_key, time_slot, expected token_prefix and mac.
- Receiver signature vectors:
  - Given receiver_secret and inputs, expected signature.
- Webhook signature vectors:
  - Given webhook_secret, timestamp, payload, expected header.
- End-to-end scenarios:
  - Unknown device → presence.unknown → link created with registration_blob → registered device → presence.check_in with verified MAC.
  - Duplicate events rejected or flagged.
  - Time skew and replay rules enforced.

---

16. NON-NORMATIVE IMPLEMENTATION GUIDANCE

---

- T = 15 seconds is a good default rotation.
- Advertising interval 200–500 ms is a good balance.
- Backend in TypeScript/Node, Receiver in Python, Mobile in Kotlin/Swift are recommended stacks.
- Use Docker + managed Postgres + KMS for Cloud deployment.

---

17. CONCLUSION

---

HNNP v2 (Option A symmetric) maintains:

- Strong anonymity and privacy.
- No device internet requirement.
- Extremely low battery use on devices.
- Cryptographically verifiable presence for linked devices via device_auth_key.
- Strong anti-replay and anomaly detection.
- Reasonable mitigation of wormhole and spoofing.

This file is the canonical v2 specification. Any production implementation of HNNP MUST follow this specification exactly.
