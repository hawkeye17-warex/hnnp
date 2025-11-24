# NearID Admin Console & Cloud API

This repo hosts the NearID admin console (React/Vite) and the Cloud API backend (Express/Prisma).

## Repository Structure
- admin-console/ — web app for org admins (overview, receivers, presence, keys, settings)
- backend/ — Cloud API (org/receiver CRUD, presence, keys, audit, maintenance)
- protocol/, receiver/, mobile/, sdk/, tests/ — protocol reference and device/client code

## Setup
1) Backend
```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL, API_KEY_SECRET
npm run prisma:generate
npm run build
npm run dev    # or npm start after build
```
2) Frontend
```bash
cd admin-console
npm install
cp ../.env .env.local  # set VITE_BACKEND_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

## Environment Keys
- backend/.env
  - DATABASE_URL: Postgres (Supabase)
  - API_KEY_SECRET: HMAC secret for API keys
- admin-console/.env.local
  - VITE_BACKEND_BASE_URL: backend base URL
  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: for auth logging

## Deploying
- Backend: deploy Node service, run `npm run build`; apply Prisma migrations (Org, Receiver, ApiKey, PresenceEvent, AdminUser, AuditLog).
- Frontend: `npm run build` in admin-console, host `dist` (e.g., Vercel) with env vars above.

## Cloud API Overview
- Org bootstrap: `POST /internal/orgs/create` → returns orgId + admin key
- Orgs: `GET/PATCH /v2/orgs/:id`
- Receivers: `GET/POST/PATCH /v2/orgs/:id/receivers`
- Presence: `GET /v2/orgs/:id/presence`
- API Keys: `GET/POST /v2/orgs/:id/keys`, `POST /v2/orgs/:id/keys/:type/rotate` (raw key shown once)
- System Settings: `GET/PATCH /v2/orgs/:id/settings` (presence expiry, rate limits, retention, notification emails, alert toggles)
- Audit Logs: `GET /internal/audit-logs` (auditor+)
- Admin Users: `/internal/admin-users` CRUD (superadmin)
- Global Search: `GET /internal/search?q=...` (auditor+)
- Maintenance: `GET/POST /internal/maintenance` (superadmin) → 503 guard

## Admin Console
- React + React Router with lazy loading
- Pages: Overview, Receivers, Presence, Links, Org Settings, System Settings (notifications + maintenance), Organizations, Admin Users, Audit Logs, Global Search, API Docs
- Bundle analysis: `npm run analyze` (creates `dist/bundle-analysis.html`)

## CRUD Flows (Frontend)
- Use the Login page with Org ID + API key (hnnp_live_...).
- Org/receiver management under Organizations/Receivers.
- Keys tab (Org Settings) for key generate/rotate (raw key shown once).
- System Settings to adjust expiry, rate limits, retention, notification inbox (hnnp.nearid@gmail.com by default), per-org email, alert toggles, maintenance.

## Troubleshooting
- 401/403: check API key scope (superadmin/admin/auditor/read-only) and format `hnnp_live_...`.
- 404 on new routes: redeploy backend with latest main; verify VITE_BACKEND_BASE_URL.
- Missing tables (AuditLog/AdminUser): apply Prisma migrations.
- Invalid key: ensure API_KEY_SECRET unchanged; rotate if exposed.
- Maintenance errors: requires superadmin key; backend must include maintenance routes.

## Logs Meaning
- presence logs: auth_result, token_prefix, timestamps, receiver/org IDs.
- audit logs: action (org_create, receiver_create/update, api_key_generate/rotate, admin_login, system_settings_update), actor key/role.

## Security Notes
- API keys hashed with API_KEY_SECRET; raw keys only on creation/rotation.
- RBAC enforced via scopes: superadmin > admin > auditor > read-only.
- Maintenance mode returns 503 for most endpoints.
- Keep DATABASE_URL and API_KEY_SECRET secret; rotate keys if leaked.

## E2E Smoke
- `BACKEND_URL=https://... node backend/scripts/e2e-smoke.mjs`
  - Creates org + key, receiver CRUD, presence query, role restriction check, org list.
