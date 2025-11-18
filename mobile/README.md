# HNNP Mobile Broadcaster (Overview)

This directory contains the mobile implementations of the HNNP v2 broadcaster (Android and iOS).
They are responsible for generating rotating presence tokens and advertising them via BLE.

All logic MUST strictly follow the canonical v2 specification in:
`../protocol/spec.md`

---

## Responsibilities (v2)

For each device (Android/iOS), implementations MUST:

- Generate and securely store `device_secret` using platform-secure storage (Keystore/Keychain).
- Derive `device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")`.
- Compute `time_slot = floor(unix_time / T)` with `T` from the spec (recommended 15s).
- Compute
  `full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || "hnnp_v2_presence")`.
- Extract `token_prefix` as the first 16 bytes of `full_token`.
- Compute
  `mac_full = HMAC-SHA256(device_auth_key, version || flags || encode_uint32(time_slot) || token_prefix)`
  and `mac = first 8 bytes` of `mac_full`.
- Construct the v2 BLE advertisement payload exactly as defined in Sections 5 and 6 of `spec.md`:
  - version: 1 byte (0x02)
  - flags: 1 byte
  - time_slot: 4 bytes (uint32, big-endian)
  - token_prefix: 16 bytes
  - mac: 8 bytes
- Broadcast BLE packets using the platform BLE APIs, respecting privacy and power guidance in the spec.

---

## Platform-Specific Docs

- Android: `android/README.md`
- iOS: `ios/README.md`

Both platform READMEs and implementations MUST remain consistent with `protocol/spec.md` v2.
