import request from "supertest";
import crypto from "crypto";
import { app } from "../index";
import { encodeUint32BE } from "../services/uint";
import { deriveDeviceIds } from "../services/crypto";
import { registerDeviceKey } from "../services/devices";
import { presenceEvents } from "../routes/presence";
import { getWebhookQueuePayloadsForTest } from "../services/webhooks";

const ORG_ID = "org_test";
const RECEIVER_ID = "receiver_test";
const RECEIVER_SECRET = "receiver_secret_test";
const DEVICE_ID_SALT = "device_id_salt_test";

// Deterministic 32-byte device_secret for tests (device-side).
const DEVICE_SECRET = Buffer.alloc(32, 7); // 0x07 repeated

const VERSION = 0x02;
const FLAGS = 0x00;

function deriveDeviceAuthKeyHex(): string {
  const h = crypto.createHmac("sha256", DEVICE_SECRET);
  h.update("hnnp_device_auth_v2");
  return h.digest("hex");
}

const DEVICE_AUTH_KEY_HEX = deriveDeviceAuthKeyHex();

function buildDevicePacket(timeSlot: number): {
  timeSlot: number;
  tokenPrefixHex: string;
  macHex: string;
} {
  const key = Buffer.from(DEVICE_AUTH_KEY_HEX, "hex");

  // Device-side full_token and token_prefix per spec Section 5.
  const tokenHmac = crypto.createHmac("sha256", key);
  tokenHmac.update(encodeUint32BE(timeSlot));
  tokenHmac.update(Buffer.from("hnnp_v2_presence", "utf8"));
  const fullToken = tokenHmac.digest();
  const tokenPrefix = fullToken.subarray(0, 16);
  const tokenPrefixHex = tokenPrefix.toString("hex");

  // Device-side packet MAC per spec Section 5.3.
  const macHmac = crypto.createHmac("sha256", key);
  macHmac.update(Buffer.from([VERSION & 0xff, FLAGS & 0xff]));
  macHmac.update(encodeUint32BE(timeSlot));
  macHmac.update(tokenPrefix);
  const fullMac = macHmac.digest();
  const macHex = fullMac.subarray(0, 8).toString("hex");

  return { timeSlot, tokenPrefixHex, macHex };
}

function buildPresenceReport(timeSlot: number, timestamp: number) {
  const { tokenPrefixHex, macHex } = buildDevicePacket(timeSlot);

  // Receiver signature per spec Section 7.4.
  const sigHmac = crypto.createHmac("sha256", Buffer.from(RECEIVER_SECRET, "utf8"));
  sigHmac.update(Buffer.from(ORG_ID, "utf8"));
  sigHmac.update(Buffer.from(RECEIVER_ID, "utf8"));
  sigHmac.update(encodeUint32BE(timeSlot));
  sigHmac.update(Buffer.from(tokenPrefixHex, "hex"));
  sigHmac.update(encodeUint32BE(timestamp));
  const signatureHex = sigHmac.digest("hex");

  return {
    org_id: ORG_ID,
    receiver_id: RECEIVER_ID,
    timestamp,
    time_slot: timeSlot,
    version: VERSION,
    flags: FLAGS,
    token_prefix: tokenPrefixHex,
    mac: macHex,
    signature: signatureHex,
  };
}

async function registerDeviceForSlot(timeSlot: number): Promise<string> {
  const { tokenPrefixHex } = buildDevicePacket(timeSlot);

  const { deviceIdHex } = deriveDeviceIds({
    deviceIdSalt: DEVICE_ID_SALT,
    timeSlot,
    tokenPrefixHex,
  });

  await registerDeviceKey({
    orgId: ORG_ID,
    deviceId: deviceIdHex,
    deviceAuthKeyHex: DEVICE_AUTH_KEY_HEX,
  });

  return deviceIdHex;
}

describe("device + receiver + cloud integration", () => {
  beforeAll(() => {
    process.env.RECEIVER_ORG_ID = ORG_ID;
    process.env.RECEIVER_ID = RECEIVER_ID;
    process.env.RECEIVER_SECRET = RECEIVER_SECRET;
    process.env.DEVICE_ID_SALT = DEVICE_ID_SALT;
    process.env.MAX_SKEW_SECONDS = "120";
    process.env.MAX_DRIFT_SLOTS = "1";
    process.env.DUPLICATE_SUPPRESS_SECONDS = "5";
    process.env.IMPOSSIBLE_TRAVEL_SECONDS = "60";
  });

  beforeEach(() => {
    presenceEvents.length = 0;
  });

  it("accepts unregistered device reports across multiple time_slots", async () => {
    const serverTime = Math.floor(Date.now() / 1000);
    const baseSlot = Math.floor(serverTime / 15);

    const slots = [baseSlot, baseSlot + 1];

    for (const slot of slots) {
      const timestamp = serverTime + (slot - baseSlot) * 15;
      const report = buildPresenceReport(slot, timestamp);
      const res = await request(app).post("/v2/presence").send(report);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("accepted");
      expect(res.body.linked).toBe(false);
    }

    expect(presenceEvents.length).toBe(slots.length);
    // Sessions now persisted in DB; presenceSessions is no longer tracked in memory.
  });

  it("accepts registered device report with valid MAC", async () => {
    const serverTime = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(serverTime / 15);

    const deviceIdHex = await registerDeviceForSlot(timeSlot);
    const report = buildPresenceReport(timeSlot, serverTime);

    const res = await request(app).post("/v2/presence").send(report);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
    expect(presenceEvents.length).toBe(1);
    expect(presenceEvents[0].device_id).toBe(deviceIdHex);
  });

  it("rejects reports with timestamp skew beyond max_skew_seconds", async () => {
    const serverTime = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(serverTime / 15);
    const tooOldTimestamp = serverTime - 121; // > MAX_SKEW_SECONDS

    const report = buildPresenceReport(timeSlot, tooOldTimestamp);
    const res = await request(app).post("/v2/presence").send(report);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Timestamp skew too large/);
    expect(presenceEvents.length).toBe(0);
    // Sessions now persisted in DB; presenceSessions is no longer tracked in memory.
  });

  it("rejects duplicate presence reports in the same 15-second window", async () => {
    const serverTime = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(serverTime / 15);

    const report = buildPresenceReport(timeSlot, serverTime);

    const first = await request(app).post("/v2/presence").send(report);
    expect(first.status).toBe(200);

    const second = await request(app).post("/v2/presence").send(report);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/Duplicate presence event in same time_slot/);

    expect(presenceEvents.length).toBe(1);
    // Sessions now persisted in DB; presenceSessions is no longer tracked in memory.
  });

  it("handles full E2E flow: unknown -> link -> linked presence with presence.check_in webhook", async () => {
    process.env.WEBHOOK_SECRET = "test_webhook_secret";
    process.env.WEBHOOK_URL = "http://localhost:9999/fake-webhook";

    const serverTime = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(serverTime / 15);

    // Step 1: Receiver sends an unknown presence report (unlinked device).
    const report1 = buildPresenceReport(timeSlot, serverTime);
    const res1 = await request(app).post("/v2/presence").send(report1);

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe("accepted");
    expect(res1.body.linked).toBe(false);
    const presenceSessionId = res1.body.presence_session_id;
    expect(typeof presenceSessionId).toBe("string");

    // Step 2: External system links the presence_session to a user via /v2/link.
    const userRef = "user_123";
    const resLink = await request(app)
      .post("/v2/link")
      .send({
        org_id: ORG_ID,
        presence_session_id: presenceSessionId,
        user_ref: userRef,
      });

    expect(resLink.status).toBe(200);
    expect(resLink.body.status).toBe("linked");
    expect(resLink.body.user_ref).toBe(userRef);

    // Step 3: Receiver sends another presence in the same time_slot but with a later timestamp.
    // This should resolve to a linked device and enqueue a presence.check_in webhook.
    const laterTimestamp = serverTime + 6; // >= duplicate window so it is not rejected outright.
    const report2 = buildPresenceReport(timeSlot, laterTimestamp);
    const res2 = await request(app).post("/v2/presence").send(report2);

    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe("accepted");
    expect(res2.body.linked).toBe(true);

    const payloads = getWebhookQueuePayloadsForTest();
    const types = payloads.map((p) => p.type);
    expect(types).toContain("presence.check_in");
  });
});
