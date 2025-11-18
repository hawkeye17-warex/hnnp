# HNNP – Human Near-Node Protocol

HNNP is a secure, privacy-preserving presence-verification protocol that proves physical proximity to a receiver using rotating BLE broadcast tokens. This repository contains the complete reference implementation of the protocol, including backend, receiver, mobile token broadcaster, and SDKs.

All implementations MUST strictly follow the canonical specification located at:
hnnp/protocol/spec.md

---

## Repository Structure

hnnp/
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

1. Install backend:
   cd hnnp/backend
   npm install
   npm run dev
2. Run receiver:
   cd hnnp/receiver
   python3 src/main.py
3. Use mobile broadcasters:
   See hnnp/mobile/android/README.md
   See hnnp/mobile/ios/README.md
4. Use SDKs:
   Node: import HnnpClient from @hnnp/sdk
   Python: from hnnp_sdk import HnnpClient

---

## Documentation

Protocol Spec (MANDATORY): hnnp/protocol/spec.md
Architecture Overview: architecture.md
Developer Onboarding: developer_onboarding.md
Contributing Guidelines: CONTRIBUTING.md

---

## Core Concepts (Summary)

- Device broadcasts rotating BLE tokens; no identity in packet.
- Receiver scans BLE, signs reports, sends to Cloud.
- Cloud derives device_id and classifies presence.
- Webhooks notify external systems.
- Everything cryptographically authenticated.

---

## Tech Stack

Backend: Node.js (TypeScript)
Receiver: Python or Node.js
Mobile: Kotlin & Swift
SDKs: Node + Python
Database: PostgreSQL

---

## License

MIT or Apache-2 recommended.
