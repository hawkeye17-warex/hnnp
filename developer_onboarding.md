# HNNP Developer Onboarding

Welcome to the HNNP engineering environment.
This document explains exactly how new developers should set up, run, and understand the HNNP ecosystem.

Every implementation MUST follow: protocol/spec.md

---

## Step 1 — Read the Protocol Specification

This is mandatory.

Open and read:
protocol/spec.md

You are not allowed to write code before fully understanding:

- Token model
- BLE packet structure
- Receiver signature scheme
- Cloud API behavior
- Webhook format
- Link model
- Security requirements

---

## Step 2 — Clone the Repository

git clone `<repo-url>`
cd hnnp/

---

## Step 3 — Backend Setup

cd hnnp/backend
npm install
cp .env.example .env
npm run dev

The backend runs at:
http://localhost:3000 (example)

---

## Step 4 — Receiver Setup

cd hnnp/receiver
pip install -r requirements.txt
python3 src/main.py

The receiver will begin scanning BLE packets.

---

## Step 5 — Mobile Broadcaster Setup

Android:
  Open the Android project in Android Studio.
iOS:
  Open the Xcode project in hnnp/mobile/ios.

Ensure device_secret is created and stored securely.

---

## Step 6 — Running End-to-End Flow

1. Mobile broadcasts rotating BLE tokens.
2. Receiver captures and sends presence to backend.
3. Backend verifies → emits webhook.
4. External system handles event.

Use test vectors in:
tests/vectors

---

## Step 7 — Coding Rules

- Never change packet format.
- Never change cryptographic construction.
- Never guess missing values; always reference spec.md.
- All cross-platform implementations MUST match byte-for-byte.
- Follow file structure conventions in each module.

---

## Step 8 — Useful Commands

Run backend tests:
npm test

Run Python tests:
pytest

---

## Step 9 — Security Practices

- Never log secrets.
- Use HTTPS for ALL calls.
- Validate timestamp skew in receiver and backend.
- Use constant-time comparisons for signatures.
- Use secure storage APIs in mobile apps.

---

## Step 10 — When in Doubt

Return to:
protocol/spec.md

It is the ONE source of truth.

Do not rely on memory.
Do not rely on assumptions.
Always refer to the spec.

---

## Reference

Canonical specification: protocol/spec.md
Repository architecture: architecture.md
