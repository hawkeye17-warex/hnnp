# HNNP Backend

This directory contains the reference implementation of the HNNP Cloud backend.
It implements all server-side responsibilities defined in the v2 protocol specification, including presence verification, linking, webhook delivery, and data storage.

All backend logic MUST follow: protocol/spec.md

---

## Responsibilities

- Accept presence reports from receivers
- Verify receiver signatures (HMAC-SHA256, constant-time comparison)
- Derive device_id_base and device_id using device_id_salt, time_slot, and token_prefix as defined in the v2 spec (Sections 8.4 and 8.8)
- Enforce anti-replay and timestamp skew rules
- Match presence events to existing links
- Create presence events and presence sessions
- Emit signed webhooks to external systems
- Expose REST APIs for:
  - POST /v2/presence
  - POST /v2/link
  - DELETE /v2/link/{link_id}

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
MAX_SKEW_SECONDS=120        # max allowed |server_time - timestamp| in seconds
MAX_DRIFT_SLOTS=1           # max allowed |server_slot - time_slot| (15s windows)
DUPLICATE_SUPPRESS_SECONDS=5 # min seconds before accepting a second event in same slot
IMPOSSIBLE_TRAVEL_SECONDS=60 # window for impossible movement detection across receivers
HARDENED_MODE=false         # when true, reject suspicious events instead of just flagging

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
