import dotenv from "dotenv";
import crypto from "crypto";
import request from "supertest";
import { prisma } from "../../db/prisma";
import { app } from "../../index";

dotenv.config({ path: ".env.test" });

const ORG_ID = "test_org_presence_db";
const RECEIVER_ID = "R_db_presence";
const RECEIVER_SECRET = "receiver_secret_presence_db";

function encodeUint32BE(value: number): Buffer {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(value >>> 0, 0);
  return buf;
}

function computeSignature(params: {
  receiverSecret: string;
  orgId: string;
  receiverId: string;
  timeSlot: number;
  tokenPrefixHex: string;
  timestamp: number;
}): string {
  const { receiverSecret, orgId, receiverId, timeSlot, tokenPrefixHex, timestamp } = params;

  const hmac = crypto.createHmac("sha256", Buffer.from(receiverSecret, "utf8"));
  hmac.update(Buffer.from(orgId, "utf8"));
  hmac.update(Buffer.from(receiverId, "utf8"));
  hmac.update(encodeUint32BE(timeSlot));
  hmac.update(Buffer.from(tokenPrefixHex, "hex"));
  hmac.update(encodeUint32BE(timestamp));

  return hmac.digest("hex");
}

describe("DB: PresenceEvent logging for accepted events", () => {
  if (process.env.RUN_DB_TESTS !== "1") {
    it.skip("skipped because RUN_DB_TESTS is not set", () => {
      // Skipped in non-DB test runs.
    });
    return;
  }

  beforeAll(async () => {
    process.env.RECEIVER_ORG_ID = ORG_ID;
    process.env.RECEIVER_ID = RECEIVER_ID;
    process.env.RECEIVER_SECRET = RECEIVER_SECRET;
    process.env.DEVICE_ID_SALT = "device_id_salt_presence_db";
    process.env.MAX_SKEW_SECONDS = "300";
    process.env.MAX_DRIFT_SLOTS = "1";

    await prisma.presenceEvent.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.receiver.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.org.deleteMany({ where: { id: ORG_ID } });

    await prisma.org.create({
      data: {
        id: ORG_ID,
        name: "Presence Test Org",
        slug: "presence-test-org",
        status: "active",
      },
    });

    await prisma.receiver.create({
      data: {
        id: RECEIVER_ID,
        orgId: ORG_ID,
        displayName: "Presence Receiver DB",
        authMode: "hmac_shared_secret",
        sharedSecretHash: "placeholder", // not used by current presence handler
        status: "active",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a PresenceEvent row for an accepted presence request", async () => {
    const now = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(now / 15);
    const tokenPrefixHex = "00112233445566778899aabbccddeeff";
    const macHex = "aabbccddeeff0011";

    const signature = computeSignature({
      receiverSecret: RECEIVER_SECRET,
      orgId: ORG_ID,
      receiverId: RECEIVER_ID,
      timeSlot,
      tokenPrefixHex,
      timestamp: now,
    });

    const res = await request(app)
      .post("/v2/presence")
      .send({
        org_id: ORG_ID,
        receiver_id: RECEIVER_ID,
        timestamp: now,
        time_slot: timeSlot,
        version: 0x02,
        flags: 0,
        token_prefix: tokenPrefixHex,
        mac: macHex,
        signature,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");

    const events = await prisma.presenceEvent.findMany({
      where: { orgId: ORG_ID, receiverId: RECEIVER_ID },
    });

    expect(events.length).toBe(1);
    const evt = events[0];
    expect(evt.version).toBe(0x02);
    expect(evt.flags).toBe(0);
    expect(evt.tokenPrefix).toBe(tokenPrefixHex.toLowerCase());
    expect(Number(evt.clientTimestampMs)).toBe(now * 1000);
    expect(evt.timeSlot).toBe(timeSlot);
    expect(evt.authResult).toBe("accepted");
    expect(evt.isAnonymous).toBe(true);
  });
});

