# HNNP Protocol Specification (v0.1.0)

Human Near-Node Protocol (HNNP) is a secure, privacy-preserving protocol for determining whether a device is physically near a receiver node. It uses rotating BLE-broadcast tokens and authenticated presence reports to create a verifiable "physical presence event."

This document is the **master specification** for:

- Device behavior (token generation, BLE advertising)
- Receiver behavior (BLE scanning, report signing)
- Cloud behavior (token verification, event classification)
- Cryptography (HMAC-based tokens + device identification)
- Linking model (device_id ↔ org_id ↔ user_ref)
- APIs, webhooks, data models
- Security constraints and threat model
- Implementation guidance

All HNNP-compatible components MUST conform to this specification.

---

# 1. Goals and Non-Goals

## 1.1 Goals

- Provide cryptographically strong proof of **physical proximity** to a receiver.
- Function even when the **device has no internet**.
- Be **privacy-preserving**: no static MACs, no device identifiers in BLE packets.
- Enable organizations to link devices to their internal identifiers (user_ref).
- Support **software-only receivers** (PCs, tablets, Pi, access controllers).
- Expose **simple, clean HTTP APIs** for external systems.
- Provide a scalable presence protocol with future support for hardware receivers/OEMs.

## 1.2 Non-Goals

- Not intended to provide GPS-like global location.
- Not a replacement for identity verification/KYC.
- Not a biometric authentication system.
- Does not define UI/UX; only protocol-level behavior.

---

# 2. Core Concepts

## 2.1 Entities

### **Device**

- A phone or BLE-capable token generating rotating presence tokens.
- Contains a secret `device_secret` (32 bytes).
- Cloud assigns an internal `device_id` which is **never broadcast**.

### **Receiver**

- Software agent scanning BLE advertisements.
- Identified by `receiver_id`, authenticated by `receiver_secret`.
- Reports presence to Cloud via signed POST requests.

### **HNNP Cloud**

- Validates presence reports.
- Derives `device_id` from tokens.
- Manages link relationships.
- Sends webhooks for presence events.

### **Organization (org)**

- Logical tenant (clinic, gym, school, office, etc.)
- Identified by `org_id`.

### **External System**

- Any system consuming presence events (HR platform, gym software, EMR, etc.).

## 2.2 Link Model

A link is: (device_id, org_id) → user_ref

- Created by external system using `POST /v1/link`.
- Allows future presence events to be mapped to a specific user.

A device may be linked to many orgs independently.

---

# 3. Time & Token Model

## 3.1 Time Slot

Token rotation is based on discrete time windows:

time_slot = floor(unix_time / T)

Where:

- `unix_time`: current UTC timestamp (seconds)
- `T`: time window (10–30 seconds recommended)

Both device and cloud MUST use the same `T`.

## 3.2 Notation

- `HMAC(key, msg)` = HMAC-SHA256
- `||` = byte concatenation
- `first_N_bytes()` = left-truncate
- Endianness: **big-endian**

---

# 4. BLE Advertisement Packet

HNNP uses non-connectable BLE advertising packets.

## 4.1 Packet Structure

| Version | Flags | Time Slot | Token Prefix | MAC (truncated) |
| ------- | ----- | --------- | ------------ | --------------- |
| 1 byte  | 1byte | 4 bytes   | 16 bytes     | 4 bytes         |

### Version (1 byte)

- Current = `0x01`.

### Flags (1 byte)

- Bitfield for optional features.
- v0.1.0 = `0x00`.

### Time Slot (4 bytes)

- uint32 representation of `time_slot`.

### Token Prefix (16 bytes)

Generated as: 

full_token = HMAC(device_secret, encode(time_slot) || "presence")

token_prefix = first_16_bytes(full_token)

### MAC (4 bytes)

Integrity check:

mac_full = HMAC(device_secret,Version || Flags || TimeSlot || TokenPrefix)

mac = first_4_bytes(mac_full)

## 4.2 Privacy Guarantees

- No permanent identifier in BLE.
- Tokens rotate every time slot.
- Cloud salt prevents observers from mapping tokens to identities.

---

# 5. Cryptography

## 5.1 Device Secret

device_secret: 32 bytes random

Stored in secure OS storage.

## 5.2 Token Generation on Device

time_slot = floor(unix_time / T)

full_token = HMAC(device_secret,

encode(time_slot) || context)

token_prefix = first_16_bytes(full_token)

mac_full = HMAC(device_secret,Version || Flags || encode(time_slot) || token_prefix)

mac = first_4_bytes(mac_full)

## 5.3 Deriving device_id (Cloud-side)

Cloud uses a server-side secret salt:

device_id_full = HMAC(device_id_salt,

token_prefix || encode(time_slot))

device_id = first_16_bytes(device_id_full)

Optional per-org derivation: 

HMAC(device_id_salt, org_id || token_prefix || time_slot)


# 6. Receiver Behavior

## 6.1 Credentials

Each receiver has:

receiver_id

receiver_secret

org_id

## 6.2 BLE Scanning

Receiver MUST:

1. Scan BLE advertisements.
2. Filter packets matching HNNP identifier.
3. Parse fields (version, flags, time_slot, token_prefix, mac).

## 6.3 Presence Report

Receiver sends:

```json
{
  "org_id": "org_123",
  "receiver_id": "rx_789",
  "timestamp": 1731900000,
  "ble_payload": "...",
  "token_prefix": "...",
  "time_slot": 17319000,
  "signature": "..."
}
```

Signature: signature = HMAC(receiver_secret, org_id || receiver_id || time_slot || token_prefix || timestamp)


## 6.4 Retry & Offline Behavior

* Must queue events locally if offline.
* Must drop events older than allowed skew (Cloud configurable).

<pre class="overflow-visible!" data-start="5444" data-end="5520"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"></div></div></pre>


# 7. Cloud API

All requests use HTTPS + JSON.

## 7.1 POST /v1/presence

Submit presence report.

### Request

(above JSON)

### Cloud Behavior

1. Validate signature.
2. Validate timestamp skew.
3. Derive `device_id`.
4. Check for `(device_id, org_id)` link.
5. Save presence event.
6. Trigger webhook.

### Response (linked)

{
  "status": "accepted",
  "event_id": "evt_123",
  "linked": true,
  "link_id": "link_456",
  "user_ref": "user_001"
}

Response (unknown)

{
  "status": "accepted",
  "linked": false,
  "presence_session_id": "psess_789"
}


## 7.2 GET /v1/presence/events

List presence events.

Example response:

{
  "events": [
    {
      "event_id": "evt_123",
      "user_ref": "emp_45",
      "timestamp": 1731900000
    }
  ],
  "next_cursor": "abc"
}


## 7.3 POST /v1/link

Link unknown presence to user_ref.

{
  "org_id": "org_123",
  "presence_session_id": "psess_789",
  "user_ref": "emp_45"
}

Returns:

{ "status": "linked", "link_id": "link_456" }


## 7.4 DELETE /v1/link

<pre class="overflow-visible!" data-start="7322" data-end="7384"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"org_id"</span><span>:</span><span></span><span>"org_123"</span><span>,</span><span>
  </span><span>"link_id"</span><span>:</span><span></span><span>"link_456"</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

Returns:

<pre class="overflow-visible!" data-start="7396" data-end="7481"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"status"</span><span>:</span><span></span><span>"revoked"</span><span>,</span><span>
  </span><span>"link_id"</span><span>:</span><span></span><span>"link_456"</span><span>,</span><span>
  </span><span>"revoked_at"</span><span>:</span><span></span><span>"..."</span><span>
</span><span>}</span></span></code></div></div></pre>


# 8. Webhooks

## 8.1 Types

* `presence.check_in`
* `presence.unknown`
* `link.created`
* `link.revoked`

## 8.2 Structure

Example:

<pre class="overflow-visible!" data-start="7621" data-end="7742"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
  </span><span>"type"</span><span>:</span><span></span><span>"presence.check_in"</span><span>,</span><span>
  </span><span>"event_id"</span><span>:</span><span></span><span>"evt_123"</span><span>,</span><span>
  </span><span>"timestamp"</span><span>:</span><span></span><span>1731900000</span><span>,</span><span>
  </span><span>"user_ref"</span><span>:</span><span></span><span>"emp_45"</span><span>
</span><span>}</span><span>
</span></span></code></div></div></pre>

## 8.3 Signing

Headers:

X-HNNP-Timestamp: `<unix>`
X-HNNP-Signature: HMAC(webhook_secret, timestamp || raw_body)
External systems MUST verify both.


# 9. Data Model (Conceptual)

Tables Cloud must maintain:

* `devices(device_id, created_at)`
* `links(link_id, device_id, org_id, user_ref, created_at, revoked_at?)`
* `presence_events(event_id, device_id, org_id, receiver_id, timestamp, linked)`
* `presence_sessions(presence_session_id, device_id, first_seen)`
* `receivers(receiver_id, org_id, receiver_secret, created_at)`

# 10. Security Requirements

## 10.1 Device

* `device_secret` MUST be stored securely.
* Never exposed or logged.

## 10.2 Receiver

* Must use TLS.
* Must validate clock drift.
* Must not store secrets in logs.

## 10.3 Cloud

* Must validate all signatures.
* Must reject stale presence events.
* Must preserve org isolation.
* Must use constant-time signature comparisons.

# 11. Sequence Diagrams

## 11.1 Linked Presence

<pre class="overflow-visible!" data-start="8720" data-end="8854"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>Device</span><span></span><span>→</span><span></span><span>Receiver :</span><span></span><span>BLE</span><span></span><span>packet</span><span>
</span><span>Receiver</span><span></span><span>→</span><span></span><span>Cloud :</span><span></span><span>presence</span><span></span><span>report</span><span></span><span>(signed)</span><span>
</span><span>Cloud</span><span></span><span>→</span><span></span><span>External System :</span><span></span><span>webhook</span><span></span><span>presence.check_in</span><span>
</span></span></code></div></div></pre>

## 11.2 Unknown → Link Flow

<pre class="overflow-visible!" data-start="8885" data-end="9096"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>Device → Receiver : BLE packet
Receiver → Cloud : presence report
Cloud → </span><span>External</span><span></span><span>System</span><span> : webhook presence.unknown
</span><span>External</span><span></span><span>System</span><span> → Cloud : POST /v1/link
Cloud → </span><span>External</span><span></span><span>System</span><span> : webhook link.created</span></span></code></div></div></pre>


# 12. Extensibility & Versioning

* Version is in BLE packet (`Version` byte).
* Breaking changes require new version byte.
* Flags byte can enable optional future features.
* All changes MUST be documented in `spec.md` with a changelog.

# 13. Implementation Guidance (Non-Normative)

* Use typed languages (Go, TS) for backend and SDKs.
* Share test vectors across mobile and backend.
* Do not spread cryptographic code across files—centralize it.
* Ensure BLE advertising uses lowest practical TX power for privacy.
* Cloud should run presence verification in O(1) or O(log n) time.
* Receivers should use batched sending during high detection periods.
* Implement rate-limiting per receiver to prevent spam/Evil twin attacks.

# ✅ Done.
