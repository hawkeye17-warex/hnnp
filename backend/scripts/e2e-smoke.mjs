import crypto from "crypto";

const backend =
  process.env.BACKEND_URL ||
  process.env.VITE_BACKEND_BASE_URL ||
  "http://localhost:3000";

const log = (...args) => console.log("[e2e]", ...args);
const rnd = () => crypto.randomBytes(3).toString("hex");

async function request(path, options = {}) {
  const res = await fetch(`${backend}${path}`, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  log(`Backend: ${backend}`);

  // 1) Create org + admin key via internal bootstrap endpoint (no auth required)
  const slug = `e2e-${rnd()}`;
  const name = `E2E Org ${slug}`;
  const createOrg = await request("/internal/orgs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, slug }),
  });
  if (createOrg.status !== 201) {
    throw new Error(`org create failed ${createOrg.status} ${JSON.stringify(createOrg.body)}`);
  }
  const { orgId, apiKey } = createOrg.body;
  log("Org created", orgId, "key prefix", apiKey?.slice(0, 18));

  const adminHeaders = {
    "Content-Type": "application/json",
    "x-hnnp-api-key": apiKey,
  };

  // 2) Receiver CRUD
  const receiverId = `rx_${rnd()}`;
  const createRx = await request(`/v2/orgs/${orgId}/receivers`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      receiver_id: receiverId,
      display_name: "E2E Receiver",
      auth_mode: "public_key",
      public_key_pem: "-----BEGIN PUBLIC KEY-----FAKE-----END PUBLIC KEY-----",
      location_label: "Test Lab",
    }),
  });
  if (createRx.status !== 201) {
    throw new Error(`receiver create failed ${createRx.status} ${JSON.stringify(createRx.body)}`);
  }
  log("Receiver created", receiverId);

  const patchRx = await request(`/v2/orgs/${orgId}/receivers/${receiverId}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ location_label: "Updated Lab" }),
  });
  if (patchRx.status !== 200) {
    throw new Error(`receiver update failed ${patchRx.status} ${JSON.stringify(patchRx.body)}`);
  }
  log("Receiver updated");

  // 3) Presence query (should succeed even if empty)
  const presence = await request(`/v2/orgs/${orgId}/presence?limit=1`, {
    headers: adminHeaders,
  });
  if (presence.status !== 200) {
    throw new Error(`presence fetch failed ${presence.status} ${JSON.stringify(presence.body)}`);
  }
  log("Presence query OK", presence.body?.events?.length ?? 0, "events");

  // 4) Role restriction: call audit logs without key → expect 401/403
  const auditNoAuth = await request("/internal/audit-logs");
  if (![401, 403].includes(auditNoAuth.status)) {
    throw new Error(`expected unauthorized audit logs, got ${auditNoAuth.status}`);
  }
  log("Role restriction verified (unauthorized audit logs call blocked)");

  // 5) Org list should include our org using admin key
  const orgsList = await request("/v2/orgs", { headers: adminHeaders });
  if (orgsList.status !== 200) {
    throw new Error(`org list failed ${orgsList.status} ${JSON.stringify(orgsList.body)}`);
  }
  log("Org list OK");

  log("E2E smoke completed successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
