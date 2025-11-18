# HNNP Backend

This directory contains the reference implementation of the HNNP Cloud backend.
It implements all server-side responsibilities defined in the protocol specification, including presence verification, linking, webhook delivery, and data storage.

All backend logic MUST follow: hnnp/protocol/spec.md

---

## Responsibilities

- Accept presence reports from receivers
- Verify receiver signatures
- Derive device_id from token_prefix and time_slot
- Match presence events to existing links
- Create presence events and presence sessions
- Emit signed webhooks to external systems
- Expose REST APIs for:
  - POST /v1/presence
  - GET /v1/presence/events
  - POST /v1/link
  - DELETE /v1/link

---

## Tech Stack (Recommended)

- Node.js (TypeScript)
- PostgreSQL
- Express or Fastify
- Redis (optional for caching)
- Docker (optional)

---

## Setup

cd hnnp/backend
npm install
cp .env.example .env
npm run dev

---

## Environment Variables

DATABASE_URL=
DEVICE_ID_SALT=
WEBHOOK_SECRET=
API_KEY_SECRET=
API_BASE_URL=

---

## File Structure

src/
  api/
  crypto/
  models/
  services/
  webhooks/
  index.ts

---

## Tests

npm test

---

## Reference

See specification: ../../protocol/spec.md
