# HNNP – Human Near-Network Protocol (v2)

HNNP is a secure, privacy-preserving presence-verification protocol that proves physical proximity to a receiver using rotating BLE broadcast tokens. This repository contains the reference implementation of the v2 symmetric protocol, including backend, receiver, mobile broadcasters, and SDKs.

All implementations MUST strictly follow the canonical specification located at:
`protocol/spec.md`

---

## Repository Structure

protocol/
  spec.md
backend/
  README.md
  src/
receiver/
  README.md
  src/
mobile/
  README.md
  android/
    README.md
  ios/
    README.md
sdk/
  node/
    README.md
    src/
  python/
    README.md
    hnnp_sdk/
tests/
  README.md
  vectors/
architecture.md
developer_onboarding.md
CONTRIBUTING.md

---

## Quick Start

1. Backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
2. Receiver:
   - `cd receiver`
   - `python3 src/main.py` (after implementing receiver per spec)
3. Mobile broadcasters:
   - See `mobile/android/README.md`
   - See `mobile/ios/README.md`
4. SDKs:
   - Node: `@hnnp/sdk` (see `sdk/node/README.md`)
   - Python: `hnnp_sdk` (see `sdk/python/README.md`)

---

## Documentation

- Protocol Spec (MANDATORY): `protocol/spec.md`
- Architecture Overview: `architecture.md`
- Developer Onboarding: `developer_onboarding.md`
- Contributing Guidelines: `CONTRIBUTING.md`

---

## Core Concepts (Summary)

- Device broadcasts anonymous rotating BLE tokens; no identity in the packet.
- Receiver scans BLE, signs presence reports, and sends them to Cloud.
- Cloud derives `device_id_base` and `device_id`, classifies presence, and enforces anti-replay rules.
- Webhooks notify external systems using HMAC-SHA256 signatures over `timestamp || raw_body`.
- All critical operations use HMAC-SHA256 and constant-time comparisons as required by the v2 spec.

---

## Tech Stack

- Backend: Node.js (TypeScript)
- Receiver: Python or Node.js
- Mobile: Kotlin & Swift
- SDKs: Node + Python
- Database: PostgreSQL (recommended)

---

## License

License terms to be defined by the project owner (e.g., MIT or Apache-2). 
