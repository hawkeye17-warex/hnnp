# HNNP Cloud API (Workspace)

This workspace represents the HNNP Cloud API service.

The actual backend implementation currently lives in:

- `backend/`

You can run backend commands via this workspace:

- `npm run dev`   (proxy to `backend/` dev server)
- `npm run build` (proxy to `backend/` TypeScript build)
- `npm run start` (proxy to `backend/` compiled server)
- `npm test`      (proxy to `backend/` test suite)

All backend behavior MUST follow the canonical protocol specification in `protocol/spec.md`.

---

## Database Schema & Migrations

The Cloud API uses PostgreSQL with tables aligned to `protocol/spec.md` (Section 11: Data Model):

- `devices`
- `device_keys`
- `receivers`
- `links`
- `presence_sessions`
- `presence_events`

SQL migrations live under:

- `cloud-api/db/migrations/`

To apply the initial schema (example using `psql`):

```bash
psql "$DATABASE_URL" -f cloud-api/db/migrations/001_init_schema.sql
```

