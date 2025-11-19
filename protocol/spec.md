# HNNP Protocol Specification v3 (Option A – Symmetric, Fast, Privacy-Preserving)

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
- Protection against compromise of Cloud-side key material (e.g., `device_id_salt`, `device_auth_key`, `receiver_secret`, `webhook_secret`).
- Protection against high-power amplification or jamming attacks at the RF layer.

---

### 0.4 Defended Threats (Summary)

Within the assumptions above, HNNP v2 is explicitly designed to defend against:

- **BLE sniffing**  
  Passive observers can capture all BLE traffic, but cannot:
  - Derive device secrets or device_auth_key from token_prefix/mac.
  - Link broadcasts to a stable identity without access to Cloud keys.

- **Replay of captured BLE packets**  
  Captured packets replayed later or from another location are constrained by:
  - 15-second time_slot windows and strict time drift checks.
  - Receiver duplicate suppression and Cloud anti-replay rules.

- **Reverse engineering of app code**  
  An attacker who decompiles the mobile app learns protocol details but cannot:
  - Extract device_secret when it is stored in hardware-backed secure storage.
  - Forge tokens for other devices without their secrets.

- **Rogue receivers**  
  A receiver without a valid `(org_id, receiver_id, receiver_secret)` cannot:
  - Produce valid HMAC-signed presence reports for that org.
  - Impersonate a legitimate receiver once Cloud enforces receiver signatures.

- **Man-in-the-middle on receiver → Cloud**  
  Assuming HTTPS (TLS) and correct receiver signatures:
  - An on-path attacker cannot modify reports without breaking the HMAC.
  - Replay of old signed reports is constrained by time-slot, skew, and anti-replay rules.

### 0.5 Residual Risk

Even with the mechanisms above, several residual risks remain by design:

- **Hardware wormholes and sophisticated relays**  
  Real-time RF relays or hardware wormholes that forward both BLE packets and any optional local_beacon_nonce can still create “teleport” effects; the protocol aims to detect and raise suspicion (e.g., impossible-movement checks), not to make such attacks cryptographically impossible.

- **Cloud key compromise**  
  If an attacker compromises Cloud secrets (e.g., `device_id_salt`, stored `device_auth_key`, `receiver_secret`, `webhook_secret`), they can forge valid tokens, presence events, and webhooks for affected orgs. HNNP assumes Cloud key management is handled by standard best practices (KMS, HSM, strict access control) outside the scope of this protocol.

- **High-power RF or physical-layer attacks**  
  High-power amplification, jamming, or directional antennas may degrade coverage or bias which receivers observe presence; these are RF/operational concerns and not fully addressed by the cryptographic design.

Operators should evaluate these residual risks in the context of their deployment (receiver placement, NTP discipline, key management, and fraud monitoring) and treat HNNP as one layer in a broader defense-in-depth posture.

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
- Receiver MUST accept that the **same token_prefix will repeat multiple times** within its 15-second window.
- Receiver MUST NOT assume each advertisement contains a *new* token.

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
  - time_slot must be validated using  **15-second windowing** :
    - `time_slot = floor(timestamp / 15)`

  * Receiver SHOULD allow ±1 window tolerance for clock drift (i.e., accept current or previous window only).

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

`time_slot` represents the  **15-second token window** , not BLE interval.

Receiver may receive  **multiple packets with the same time_slot** —these should produce separate presence reports only if payload changes or timestamps differ significantly (e.g., >5 seconds).

Receiver SHOULD ignore duplicates of identical `(token_prefix, time_slot)` received within a **5-second suppress window** to reduce load during rush hours.

### 7.5 Sending Presence Reports

Receiver sends:

- POST /v2/presence

Body is JSON containing the fields above.

On network failure:

- Queue events locally, with retry.
- Drop events older than max_skew_seconds.

### **7.6 Token vs BLE Timing Clarification**

* Device rotates tokens every **15 seconds** using deterministic time-slots.
* BLE advertising frequency (300–2000 ms) is **independent** of this rotation.
* Device may broadcast the same token_prefix **30–50 times** per slot.
* Receiver MUST treat these as  **multiple broadcasts of the same active token** , not multiple different tokens.
* Receiver only needs to capture **one valid packet per 15-second window** to confirm presence.
* During high-density periods (rush hours), receiver should rely on **continuous scanning** to ensure packet capture inside each token window.

---

### 7.7 Receiver Identity and Authentication (v2)

Receivers are identified and authenticated at the HTTP layer using an `(org_id, receiver_id, receiver_secret)` tuple.

- Each receiver belongs to exactly one `org_id` and has a stable `receiver_id` within that org.
- Each `(org_id, receiver_id)` pair has a dedicated `receiver_secret` (Section 3.3) which MUST be:
  - 32 random bytes, provisioned by Cloud or a secure controller.
  - Stored only on the receiver host and in Cloud secret storage.
  - Never present on mobile devices.

For every `POST /v2/presence` request, the receiver computes a **receiver signature**:

```text
signature = HMAC-SHA256(receiver_secret,
             org_id || receiver_id || encode_uint32(time_slot) ||
             token_prefix || encode_uint32(timestamp))
```

where:

- `org_id` and `receiver_id` are UTF-8 strings.
- `time_slot` and `timestamp` are encoded as 32-bit unsigned integers (big-endian).
- `token_prefix` is treated as raw bytes (e.g., decoded from hex).

Cloud behavior:

- Looks up `receiver_secret` for `(org_id, receiver_id)` in its `receivers` data model (Section 11).
- Recomputes `expected_signature` using the same formula.
- Uses constant-time comparison to compare `expected_signature` and the reported `signature`.
- Rejects the report (HTTP 401/404) if:
  - `(org_id, receiver_id)` is unknown, or
  - the signature comparison fails.

Multi-receiver deployments:

- Orgs MAY deploy many receivers that all share the same `org_id` but have distinct `receiver_id` values.
- `receiver_id` MUST be unique per `org_id` (per row in the `receivers` table).
- Presence events always include `receiver_id`, allowing Cloud and downstream systems to reason about:
  - which physical receiver observed the event, and
  - anomalies such as the same device appearing at multiple receivers within an impossible time window.

---

# 8. CLOUD VERIFICATION AND PRESENCE PROCESSING (v2)

---

On POST /v2/presence:

### 8.1 Input Validation

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

### 8.2 Receiver Lookup and Signature Verification

Find receiver_secret for (org_id, receiver_id).

If none → reject (HTTP 401/404).

Recompute:

expected_signature = HMAC-SHA256(receiver_secret,
                                 org_id || receiver_id || encode_uint32(time_slot) ||
                                 token_prefix || encode_uint32(timestamp))

If constant_time_compare(expected_signature, signature) fails → reject (401).

### 8.3 Timestamp Skew Check

Let server_time = current UTC Unix time.

If abs(server_time − timestamp) > max_skew_seconds → reject (400).

### 8.4 Derive Preliminary Device ID (Anonymous)

Compute an anonymous device fingerprint that does NOT rely on device_auth_key:

device_id_base = HMAC-SHA256(device_id_salt,
                             encode_uint32(time_slot) || token_prefix)

Use full 32 bytes or a consistent truncation (e.g., 16–32 bytes) as device_id_base.

This identifies a “cryptographic device” without requiring onboarding.

### 8.5 Link and Registration Status

For (org_id, device_id_base), Cloud maintains state:

- unregistered: device has never provided device_auth_key (no cryptographic proof of origin).
- registered: device has provided device_auth_key via onboarding, and Cloud has stored device_auth_key for this device_id.

### 8.6 MAC Verification for Registered Devices

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

### 8.7 Anti-Replay Rules

Cloud MUST enforce:

- For each (org_id, device_id_base, receiver_id, time_slot):
  - Only the first valid event is marked as normal.
  - Subsequent events in the same time_slot from the same receiver may be:
    - rejected, or
    - stored but flagged as duplicates.

Cloud SHOULD also detect and flag:

- Same (org_id, device_id_base) appearing at multiple receivers far apart within an impossible time window.

### 8.8 Device ID for Business Logic

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

### 8.10 Event Persistence

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

### 8.11 Response to Receiver

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

# 9. LINK MANAGEMENT (v2)

---

### 9.1 Creating a Link (POST /v2/link)

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

### 9.2 Revoking a Link (DELETE /v2/link/{link_id})

Cloud behavior:

- Mark link as revoked with revoked_at.
- Future presence events will no longer resolve to that link.
- Emit webhook: link.revoked.

Response:

- status: "revoked"
- link_id
- revoked_at

### 9.3 Device Registration & Revocation

This subsection summarizes the lifecycle of device registration, linking, and revocation using the primitives defined in Sections 3 and 9.

**Device key material**

- On install, each device generates a fresh `device_secret` (32 random bytes) and stores it only in OS secure storage (Section 3.1).
- The device derives `device_auth_key` from this secret:

  - `device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")` (Section 3.2).

- `device_secret` is never sent to Cloud. `device_auth_key` is only revealed during onboarding, via a registration blob.

**Registration blob contents**

- To allow Cloud to verify future tokens from this device, the device computes a `registration_blob`:

  - `registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2") || device_local_id`

- `device_local_id` is a random per-device identifier used only within the onboarding flow.
- The exact transport format (QR, deep link, etc.) is non-normative, but the blob itself MUST be treated as confidential and unforgeable.

**Linking with /v2/link**

- When Cloud has observed presence for an unknown device, it creates a `presence_session` and returns `presence_session_id` to the receiver.
- An external system (e.g., access control backend) calls `POST /v2/link` with:

  - `org_id`
  - `presence_session_id` (identifies the unknown device)
  - `user_ref` (external user identifier)
  - `registration_blob` (optional but recommended, as above)

- As described in Section 9.1, Cloud:

  - Resolves `presence_session_id` → `device_id`.
  - Validates `registration_blob` using the device-side derivation rules.
  - Stores `device_auth_key` for that `device_id` and marks the device as registered.
  - Creates a `link` between `(org_id, device_id)` and `user_ref`.

After this, presence events for that `device_id` are treated as *linked* and MACs can be fully verified using the stored `device_auth_key`.

**App reinstall and new devices**

- If the app is reinstalled on a phone, it generates a new `device_secret` and therefore a new `device_auth_key` and `registration_blob`.
- Cloud will derive a new `device_id` for tokens from this fresh key material.
- Implementations SHOULD treat each reinstall as a new device:

  - The new install MUST follow the normal onboarding flow (new `registration_blob`, new `/v2/link` call).
  - Any existing links for the old `device_id` MAY be revoked via `DELETE /v2/link/{link_id}` if the old installation is no longer trusted.

**Lost or compromised devices**

- When a device is lost or compromised, the external system SHOULD revoke its link:

  - Identify the relevant `link_id` for `(org_id, device_id, user_ref)`.
  - Call `DELETE /v2/link/{link_id}` as described in Section 9.2.

- Revocation semantics:

  - The link is marked as revoked (`revoked_at` set).
  - Future presence events from that `device_id` no longer resolve to the revoked link.
  - Cloud MAY continue to accept and classify such events as anonymous presence (unknown device), depending on policy.

**Multiple devices per user**

- The protocol allows a single `user_ref` to be linked to multiple devices:

  - Each physical device has its own `device_secret`, `device_auth_key`, and resulting `device_id`.
  - `POST /v2/link` can be invoked multiple times with the same `user_ref` but different `presence_session_id` values (corresponding to different devices).

- Cloud maintains separate links for each `(org_id, device_id, user_ref)` tuple:

  - Presence events from any linked device produce `presence.check_in` webhooks that include both `device_id` and `user_ref`.
  - Revoking one link does not affect other devices linked to the same `user_ref`; they remain valid until explicitly revoked.

---

# 10. WEBHOOKS (v2)

---

### 10.1 Event Types

- presence.check_in
- presence.unknown
- link.created
- link.revoked

### 10.2 Payload Examples

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

### 10.3 Webhook Signing

Headers:

- X-HNNP-Timestamp: unix timestamp (string).
- X-HNNP-Signature: hex of HMAC-SHA256(webhook_secret, timestamp || raw_body).

External system MUST:

- Recompute expected = HMAC-SHA256(webhook_secret, timestamp || raw_body).
- Constant-time compare with X-HNNP-Signature.
- Optionally reject if timestamp is too old.

---

# 11. DATA MODEL (CONCEPTUAL)

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

# 12. SECURITY REQUIREMENTS (v2)

---

### 12.1 Secret Management

- device_secret: only on device, hardware-backed where possible.
- device_auth_key (Cloud side): stored encrypted (e.g., KMS-managed).
- receiver_secret: stored as a secret; never logged.
- device_id_salt: stored only in Cloud secret manager.
- webhook_secret: per-org, secret-managed.

### 12.2 Constant-Time Checks

All checks on:

- receiver signature
- mac
- webhook signatures

MUST use constant-time comparison.

### 12.3 Logging Restrictions

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

### 12.4 Anti-Replay

* time_slot MUST be derived using **15-second windows** (i.e., `floor(timestamp / 15)` on both device + Cloud).
* Cloud SHOULD accept time_slot within **±1 window tolerance** to handle receiver/phone clock drift, but MUST reject windows beyond that.
* Reject duplicate presence reports with the same `(org_id, device_id, receiver_id, time_slot)` **unless the packet timestamp differs by ≥5 seconds** (to allow congestion-based retries).
* Accept that multiple BLE packets with identical `(token_prefix, time_slot)` may exist; anti-replay applies to  **Cloud presence reports** , not raw BLE packets.

#### 12.4.1 Time Drift & Anti-Replay Rules

This subsection makes the time and replay requirements explicit in terms of the 15-second rotation window and the server’s deduplication behavior.

- Token rotation window:
  - Devices and Cloud MUST treat `time_slot` as a 15-second window, derived as `time_slot = floor(unix_time / 15)` (Section 4).

- Allowed drift:
  - Let `MAX_DRIFT_SLOTS` be a small non-negative integer (recommended default: 1).
  - For each presence report, Cloud computes `server_time = now()` and `server_slot = floor(server_time / 15)`.
  - Cloud MUST reject any report whose `time_slot` differs from `server_slot` by more than `MAX_DRIFT_SLOTS`, i.e. when `|time_slot - server_slot| > MAX_DRIFT_SLOTS`.

- Duplicate suppression window:
  - Let `duplicate_suppress_seconds` be a small positive integer (recommended default: 5 seconds).
  - Cloud tracks the last accepted report per `(org_id, device_id, receiver_id, time_slot)` (or an equivalent stable identifier).
  - For each such tuple:
    - The first valid report is accepted as normal.
    - Any subsequent report with the same tuple and `timestamp < previous_timestamp + duplicate_suppress_seconds` MUST be rejected as a duplicate.
    - Subsequent reports with `timestamp >= previous_timestamp + duplicate_suppress_seconds` MAY be accepted as retries but SHOULD be flagged as duplicates or suspicious.
  - These anti-replay rules apply to Cloud presence reports; receivers are still expected to perform their own local duplicate suppression over BLE packets as described in Section 7.

### 12.5 Wormhole Mitigation (Recommended)

To reduce wormhole attacks (remote replay in real-time), HNNP v2 recommends:

* Optional local_beacon_nonce broadcast by receiver (e.g., via another BLE service).
* Device includes local_beacon_nonce in full_token derivation when available:
* full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || local_beacon_nonce || "hnnp_v2_presence")
* Cloud checks that reported receiver is consistent with the nonces that device could have seen.
* This makes simple remote replay harder unless attacker relays nonces in real-time.
* When local_beacon_nonce is used, device MUST bind nonce to the  **current 15-second time_slot** ; replays across time_slots MUST be rejected.

### **12.6 Token vs BLE Timing Security Constraints**

To prevent timing-based replay attacks:

* BLE advertising frequency (300–2000 ms) is independent from token rotation and MUST NOT be used as a security parameter.
* Token rotation is the only security boundary; tokens MUST remain valid strictly within their  **15-second time_slot window** .
* Device must generate a new token **immediately** when entering a new time_slot, even if BLE is delayed.
* Cloud MUST reject any presence report whose time_slot does not match the expected 15-second boundary, except within allowed drift (±1 window).
* Cloud MUST NOT assume BLE broadcast frequency provides any replay protection — all replay resistance is tied to the 15-second token windowing.

Exact local_beacon_nonce mechanism is non-normative but MUST maintain anonymity (no IDs in nonce).

---

# 13. PRIVACY AND ANONYMITY

---

### 13.1 Broadcast Anonymity

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

### 13.2 Cloud-Only Identity Mapping

Only Cloud (with device_id_salt and device_auth_key) can:

- Derive internal device_id.
- Confirm MAC correctness.
- Map presence to a link (user_ref) via external system.

### 13.3 Cross-Org Isolation

If implemented per-org:

- Each org has its own device_id_salt and device_auth_key namespace.
- device_id is not globally shared across orgs.
- No org can see another org’s links or presence, by design.

---

# 14. VERSIONING

---

- version byte = 0x02 for this spec.
- v1 (0x01) is legacy and SHOULD be deprecated over time.
- Any future breaking changes MUST increment version to 0x03 and define new rules.

Receivers MAY:

- Support both v1 and v2 in transition, but MUST clearly distinguish them.

---

# 15. COMPLIANCE AND TESTING

---

v2-compliant implementations MUST pass:


Token generation vectors:

- Given device_auth_key, time_slot, expected token_prefix and mac.

Receiver signature vectors:

- Given receiver_secret and inputs, expected signature.

Webhook signature vectors:

- Given webhook_secret, timestamp, payload, expected header.

End-to-end scenarios:

* Unknown device → presence.unknown → link created with registration_blob → registered device → presence.check_in with verified MAC.
* Duplicate events rejected or flagged.
* Time skew and replay rules enforced.

### 15.1 New Test Requirements (ADD)

Token timing vectors:

- Verify device generates correct time_slot = floor(timestamp / 15).
- Verify token rotates exactly every 15 seconds, with no overlap.

BLE timing independence tests:

- Ensure token rotation correctness does not depend on BLE advertising interval.
- Validate that packets broadcast at any BLE interval still map to the same 15s time_slot.

Duplicate suppression tests:

- Ensure receiver suppresses duplicate (token_prefix, time_slot) packets within a 5-second window.
- Ensure Cloud anti-replay rejects duplicates per (org_id, device_id, receiver_id, time_slot) unless timestamp differs by ≥5s.

±1 time-slot drift acceptance:

- Test Cloud acceptance of time_slot within ±1 window for clock drift.
- Reject events outside allowed drift.

---

# 16. NON-NORMATIVE IMPLEMENTATION GUIDANCE

---

- T = 15 seconds is a good default rotation.
- Advertising interval 200–500 ms is a good balance.
- Backend in TypeScript/Node, Receiver in Python, Mobile in Kotlin/Swift are recommended stacks.
- Use Docker + managed Postgres + KMS for Cloud deployment.

---

# 17. CONCLUSION

---

HNNP v2 (Option A symmetric) maintains:

- Strong anonymity and privacy.
- No device internet requirement.
- Extremely low battery use on devices.
- Cryptographically verifiable presence for linked devices via device_auth_key.
- Strong anti-replay and anomaly detection.
- Reasonable mitigation of wormhole and spoofing.
- Token rotation operates on a strict 15-second window, fully independent from BLE advertising frequency.
- Reliability and low battery usage are achieved through decoupling: BLE handles delivery frequency, while cryptographic security depends solely on the 15-second token window.

This file is the canonical v3 specification. Any production implementation of HNNP MUST follow this specification exactly.
