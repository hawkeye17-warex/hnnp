import request from "supertest";
import crypto from "crypto";
import { app } from "../index";

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

describe("POST /v2/presence", () => {
  const receiverSecret = "test_receiver_secret_32_bytes_long!";

  beforeAll(() => {
    process.env.RECEIVER_SECRET = receiverSecret;
    process.env.RECEIVER_ORG_ID = "org_123";
    process.env.RECEIVER_ID = "rcv_001";
    process.env.MAX_SKEW_SECONDS = "300";
    process.env.DEVICE_ID_SALT = "test_device_id_salt";
  });

  it("returns 200 and status accepted for valid signature", async () => {
    const orgId = "org_123";
    const receiverId = "rcv_001";
    const now = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(now / 15);
    const tokenPrefixHex = "00112233445566778899aabbccddeeff";
    const macHex = "aabbccddeeff0011";

    const signature = computeSignature({
      receiverSecret,
      orgId,
      receiverId,
      timeSlot,
      tokenPrefixHex,
      timestamp: now,
    });

    const res = await request(app)
      .post("/v2/presence")
      .send({
        org_id: orgId,
        receiver_id: receiverId,
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
    expect(res.body.linked).toBe(false);
    expect(typeof res.body.event_id).toBe("string");
    expect(typeof res.body.presence_session_id).toBe("string");
  });

  it("returns 401 for invalid signature", async () => {
    const orgId = "org_123";
    const receiverId = "rcv_001";
    const now = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(now / 15);

    const res = await request(app)
      .post("/v2/presence")
      .send({
        org_id: orgId,
        receiver_id: receiverId,
        timestamp: now,
        time_slot: timeSlot,
        version: 0x02,
        flags: 0,
        token_prefix: "00112233445566778899aabbccddeeff",
        mac: "aabbccddeeff0011",
        signature: "deadbeef", // invalid
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid receiver signature/i);
  });

  it("returns 400 when time_slot is outside drift window", async () => {
    const orgId = "org_123";
    const receiverId = "rcv_001";
    const now = Math.floor(Date.now() / 1000);
    // Choose a time_slot far in the future so that |report_slot - server_slot| >> 1,
    // while keeping timestamp skew small.
    const timeSlotFarFuture = Math.floor((now + 300) / 15);

    const tokenPrefixHex = "00112233445566778899aabbccddeeff";
    const macHex = "aabbccddeeff0011";

    const signature = computeSignature({
      receiverSecret,
      orgId,
      receiverId,
      timeSlot: timeSlotFarFuture,
      tokenPrefixHex,
      timestamp: now,
    });

    const res = await request(app)
      .post("/v2/presence")
      .send({
        org_id: orgId,
        receiver_id: receiverId,
        timestamp: now,
        time_slot: timeSlotFarFuture,
        version: 0x02,
        flags: 0,
        token_prefix: tokenPrefixHex,
        mac: macHex,
        signature,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/time_slot/i);
  });
});
