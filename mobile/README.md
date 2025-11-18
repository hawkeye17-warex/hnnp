# HNNP iOS (Swift)

This module implements the iOS version of the HNNP mobile broadcaster.
It is responsible for generating rotating tokens and advertising them via BLE using CoreBluetooth.

All logic MUST strictly follow the canonical specification in:
hnnp/protocol/spec.md

---

## Responsibilities

- Generate and securely store device_secret using iOS Keychain
- Compute time_slot = floor(unix_time / T)
- Generate full_token = HMAC(device_secret, time_slot || "presence")
- Extract token_prefix (16 bytes)
- Compute mac (4 bytes)
- Construct BLE advertisement payload exactly as the spec defines
- Broadcast BLE packets using CoreBluetooth CBPeripheralManager
- Maintain broadcasting even in background (iOS-permitted modes)

---

## Setup

Open the Xcode project inside this directory.

Add the following to Info.plist:

NSBluetoothAlwaysUsageDescription = "HNNP requires Bluetooth to broadcast presence tokens"
UIBackgroundModes = bluetooth-peripheral

---

## File Structure

TokenGenerator.swift
BleAdvertiser.swift
SecureStorage.swift
HnnpBroadcaster.swift
AppDelegate.swift

---

## Notes

- iOS requires "bluetooth-peripheral" background entitlement for BLE advertising.
- Apple may throttle advertising when the app is killed; this is OS behavior.
- BLE payload MUST match the exact byte structure defined in spec.md:
  version (1 byte)
  flags (1 byte)
  time_slot (4 bytes, big endian)
  token_prefix (16 bytes)
  mac (4 bytes)
- device_secret MUST be stored in Keychain and never logged.
- All HMAC operations must use SHA256 and big-endian for encoding time_slot.

---

## Testing

Use vector files from:
hnnp/tests/vectors

Validate:

- token_prefix generation
- mac generation
- byte ordering
- packet assembly

---

## Reference

Full protocol spec: ../../protocol/spec.md
