# HNNP Android (Kotlin)

This module implements the Android version of the HNNP v2 mobile broadcaster.
It is responsible for generating rotating presence tokens and advertising them via BLE using Android BLE APIs.

All logic MUST follow: hnnp/protocol/spec.md

---

## Responsibilities (v2)

- Securely create and store `device_secret` using Android Keystore / EncryptedSharedPreferences.
- Derive `device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")`.
- Generate `time_slot = floor(unix_time / T)` using the v2 time model.
- Compute
  `full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || "hnnp_v2_presence")`.
- Extract `token_prefix` (first 16 bytes of `full_token`).
- Compute
  `mac_full = HMAC-SHA256(device_auth_key, version || flags || encode_uint32(time_slot) || token_prefix)`
  and `mac = first 8 bytes` of `mac_full`.
- Build the exact v2 BLE packet structure:
  - version: 1 byte (0x02)
  - flags: 1 byte
  - time_slot: 4 bytes (uint32, big-endian)
  - token_prefix: 16 bytes
  - mac: 8 bytes
- Broadcast via BluetoothLeAdvertiser using appropriate advertising intervals from the spec.
- Maintain a Foreground Service for continuous broadcasting (Android 8+).

---

## Setup

Open the Android project in Android Studio.

Gradle dependencies:

implementation "androidx.core:core-ktx:1.12.0"
implementation "org.bouncycastle:bcprov-jdk15on:1.70"
implementation "com.google.android.material:material:1.11.0"

---

## File Structure

TokenGenerator.kt
BleAdvertiser.kt
SecureStorage.kt
HnnpService.kt
MainActivity.kt
Utils.kt

---

## Notes

- Android requires a Foreground Service for long-running BLE advertisements.
- The BLE advertiser must include EXACT packet fields and lengths defined in the v2 spec (30 bytes total, 8-byte mac).
- Do not alter packet length, prefix length, or mac length.
- All HMAC operations must use HMAC-SHA256, UTF-8 for strings, and big-endian for integers.
- `device_secret` and `device_auth_key` MUST never leave secure storage or be logged.

---

## Running Debug Build

Connect Android device → enable BLE → run from Android Studio.

---

## Testing

Use test vectors in hnnp/tests/vectors (v2) to confirm:

- token_prefix correctness
- mac correctness (8-byte mac)
- packet assembly and byte ordering

---

## Reference

Full protocol: ../../protocol/spec.md
