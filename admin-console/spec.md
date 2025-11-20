**1. NearID Admin Console – Spec**

**1.1 Purpose**

The NearID Admin Console is a web dashboard for **organization
admins** to:

* See
  high-level presence activity.
* Manage
  **receivers** (the hardware / listener nodes).
* Inspect
  **presence events** (logs).
* Inspect
  **links** (user_ref ↔ device_id mappings).
* View
  and tweak basic org info/config.
* Test
  API keys and webhook flows (later).

This is NOT for end-users; it’s for ops / admins /
integrators.

**1.2 Users & Auth Model**

* **User
  role** : Org admin (someone who already has:
* an **org_id**
* an **API
  key** for that org).

To keep it simple with your existing backend:

* Login
  screen asks for:
  * orgId
    (string)
  * API
    key (string)
* Console
  stores them in local storage (or session storage) and uses them on every
  request:
  * x-hnnp-api-key:
    `<apiKey>`
  * For
    org APIs: path param /:org_id or query ?orgId=.

No email/password or SSO in v1 – that can be layered later.

**1.3 Main Sections / Pages**

App layout: left sidebar + top bar, like a real SaaS
console.

**Sidebar items:**

1. **Overview**
2. **Receivers**
3. **Presence
   Events**
4. **Links**
5. **Org
   Settings**
6. **API
   / Keys** (mostly docs/read-only in v1)

**Top bar:**

* Shows
  org name + org_id.
* Right:
  environment badge (dev/prod if you add later), and “Logout” button.

---

**1.4 Pages (Functional Spec)**

**A. Login Page**

**Route:** /login

* Fields:
  * Org
    ID (text)
  * API
    key (password field)
* Actions:
  * On
    submit, **test** the credentials by calling:
    * GET
      /v2/orgs/:org_id
    * With
      header x-hnnp-api-key: `<key>`
  * If
    200 → save orgId + apiKey in storage and redirect to /overview.
  * If
    401/403 → show “Invalid API key.”
  * If
    404 → show “Org not found.”

---

**B. Overview Dashboard**

**Route:** /overview

Simple v1:

* Summary
  cards:
  * Total
    receivers
  * Online
    receivers (status == “online” / last_seen_at within N minutes)
  * Presence
    events today
  * Unique
    users today (if backend supports, else skip / later)
* Recent
  activity:
  * Table
    with last 10 presence events:
    * Time
    * User
      ref (if present)
    * Receiver
      name
    * Status

Uses:

* GET
  /v2/orgs/:org_id/receivers
* GET
  /v1/presence/events?orgId=`<orgId>`&limit=10&sort=desc

---

**C. Receivers**

**Route:** /receivers

**List view:**

* Table:
  * Receiver
    ID
  * Display
    name
  * Location
    label
  * Auth
    mode (hmac_shared_secret / public_key)
  * Status
  * Last
    seen
* Controls:
  * Filter
    by status (all/online/offline).
  * Search
    by ID or name.

**Detail / Edit drawer or page:**

* Fields
  (read/edit):
  * Receiver
    ID (read-only after creation).
  * Display
    name.
  * Location
    label.
  * Latitude/longitude.
  * Auth
    mode (select).
  * For
    hmac_shared_secret: field to **set new shared_secret** (not read).
  * For
    public_key: text area for public_key_pem.
  * Firmware
    version (read-only).
  * Status
    (read-only, from backend).
* Actions:
  * **Create
    new receiver** :
  * Calls
    POST /v2/orgs/:org_id/receivers with:
    * receiver_id
    * display_name
    * location_label
    * latitude,
      longitude (optional)
    * auth_mode
    * shared_secret
      OR public_key_pem
  * **Update
    receiver** :
  * PATCH
    /v2/orgs/:org_id/receivers/:receiver_id

---

**D. Presence Events (Explorer)**

**Route:** /presence

* Table
  with:
  * Timestamp
  * User
    ref (if present)
  * Receiver
    (display_name)
  * Status
    (verified, failed, etc.)
  * Reason
    / debug info (if the API returns anything like that – if not, just omit)
* Filters:
  * Date
    range: from / to (ISO strings → ?from=...&to=...)
  * User
    ref (text).
  * Receiver
    ID (select/autocomplete).
  * Pagination
    (page, limit).

API:

* GET
  /v1/presence/events?orgId=<org_id>&from=...&to=...&userRef=...&receiverId=...&page=1&limit=50

---

**E. Links (User ↔ Device)**

**Route:** /links

* Table:
  * Link
    ID
  * User
    ref
  * Device
    ID
  * Status
    (pending/active/revoked)
  * Created
    at
  * Updated
    at
* Filters:
  * User
    ref
  * Status
* Actions:
  * (Optional)
    Create link manually:
    * POST
      /v1/links with { orgId, userRef, deviceId }
  * Activate/revoke
    via:
    * POST
      /v1/links/:id/activate
    * POST
      /v1/links/:id/revoke

---

**F. Org Settings**

**Route:** /org-settings

* Load
  GET /v2/orgs/:org_id.
* Show:
  * org_id
  * name
  * slug
  * status
  * created_at,
    updated_at
  * config
    JSON (editable in a code editor area).
* Option:
  * Save
    config:
    * If
      backend supports a PATCH/PUT on org (doesn’t look like it yet), keep v1
      as read-only, or just let them copy config but not write.

v1 can be read-only page.

---

**G. API / Keys page**

**Route:** /api

* Static
  content for now:
  * Show:
    * Base
      API URL (env var).
    * Example
      curl requests for:
      * Listing
        receivers
      * Fetching
        presence events
      * Creating
        links
  * Show
    the currently configured orgId (but **never** echo back the API key
    raw).

---

**1.5 Design System (for Console)**

Re-use your NearID palette:

* Blue
  #2A6DFF, green #18CB8F, muted grays, etc.

Basic layout:

* Sidebar:
  dark-ish background (#0E0E11 / #12141C), icons and labels with muted and
  accent colors.
* Main
  content: card-style layout on light background (#FAFBFF), same style as
  mobile.

We don’t need pixel-perfect Figma here – just consistent use
of:

* Cards
* Tables
* Filters
* Same
  colors.
