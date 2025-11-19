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

