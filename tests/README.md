# HNNP Test Suite

This directory contains the complete test suite for validating all components of the HNNP ecosystem, including mobile token generators, BLE packet assembly, receiver signature logic, and backend verification flow.

All tests MUST align with: hnnp/protocol/spec.md

---

## Purpose of the Test Suite

- Ensure cryptographic correctness
- Validate BLE packet formatting
- Verify receiver → backend API behavior
- Validate signature verification logic
- Provide deterministic test vectors shared across all platforms
- Ensure no implementation deviates from the protocol spec

---

## Test Categories

1. Token Generation Tests

   - Validate full_token → token_prefix creation
   - Validate MAC calculation
   - Validate time_slot behavior
   - Confirm matching results across Python, Node, Kotlin, Swift
2. BLE Packet Assembly Tests

   - Check byte order (big-endian)
   - Check lengths (v2): version(1), flags(1), time_slot(4), prefix(16), mac(8)
   - Ensure mobile implementations match backend parser
3. Signature Verification Tests

   - Receiver signature HMAC correctness
   - Timestamp skew validation
   - Constant-time HMAC comparison tests
4. Webhook Tests

   - Cloud→external signature format
   - Timestamp validation
   - Raw-body-based HMAC test data
5. Integration Tests

   - Device → Receiver → Backend → Webhook
   - Unknown → Linking → Linked presence sequence

---

## Directory Structure

tests/
  vectors/
    device_secret.bin
    expected_full_token.json
    expected_token_prefix.json
    expected_mac.json
  test_token_generator.py
  test_packet_parser.py
  test_receiver_signatures.py
  test_webhook_signatures.py
  test_integration_flow.py

---

## Running Tests (Python)

pytest

---

## Running Tests (Node.js)

npm test

---

## Notes

- All values in vectors are canonical; do NOT modify them.
- Test vectors ensure all language implementations behave identically.
- Any failing test = direct violation of the protocol spec.

---

## Reference

Full protocol specification: ../protocol/spec.md
