# HNNP Android (Kotlin)

This module implements the Android version of the HNNP mobile broadcaster.
It is responsible for generating rotating tokens and advertising them via BLE using Android BLE APIs.

All logic MUST follow: hnnp/protocol/spec.md

---

## Responsibilities

- Securely create and store device_secret using Android Keystore
- Generate time_slot = floor(unix_time / T)
- Compute full_token using HMAC-SHA256
- Extract token_prefix (16 bytes)
- Compute mac (4 bytes)
- Build correct BLE packet structure
- Broadcast via BluetoothLeAdvertiser
- Maintain a Foreground Service for continuous broadcasting (Android 8+)

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
- The BLE advertiser must include EXACT packet fields defined in the spec.
- Do not alter packet length, prefix length, or mac length.
- All HMAC operations must use UTF-8 and big-endian for integers.
- device_secret MUST never leave SecureStorage.

---

## Running Debug Build

Connect Android device → enable BLE → run from Android Studio.

---

## Testing

Use test vectors in hnnp/tests/vectors to confirm:

- token_prefix correctness
- mac correctness
- packet assembly

---

## Reference

Full protocol: ../../protocol/spec.md
