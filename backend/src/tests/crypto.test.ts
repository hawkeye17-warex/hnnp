import crypto from "crypto";
import { verifyReceiverSignature, verifyPacketMac } from "../services/crypto";

function encodeUint32BE(value: number): Buffer {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(value >>> 0, 0);
  return buf;
}

describe("backend crypto: verifyReceiverSignature", () => {
  const receiverSecret = "receiver_secret_for_tests";
  const orgId = "org_123";
  const receiverId = "rcv_001";
  const timeSlot = 42;
  const tokenPrefixHex = "00112233445566778899aabbccddeeff";
  const timestamp = 1731900000;

  function computeSignature(): string {
    const hmac = crypto.createHmac("sha256", Buffer.from(receiverSecret, "utf8"));
    hmac.update(Buffer.from(orgId, "utf8"));
    hmac.update(Buffer.from(receiverId, "utf8"));
    hmac.update(encodeUint32BE(timeSlot));
    hmac.update(Buffer.from(tokenPrefixHex, "hex"));
    hmac.update(encodeUint32BE(timestamp));
    return hmac.digest("hex");
  }

  it("accepts a valid receiver signature", () => {
    const signature = computeSignature();

    const ok = verifyReceiverSignature({
      receiverSecret,
      orgId,
      receiverId,
      timeSlot,
      tokenPrefix: tokenPrefixHex,
      timestamp,
      signature,
    });

    expect(ok).toBe(true);
  });

  it("rejects an invalid receiver signature", () => {
    const badSignature = "deadbeef";

    const ok = verifyReceiverSignature({
      receiverSecret,
      orgId,
      receiverId,
      timeSlot,
      tokenPrefix: tokenPrefixHex,
      timestamp,
      signature: badSignature,
    });

    expect(ok).toBe(false);
  });
});

describe("backend crypto: verifyPacketMac", () => {
  const deviceAuthKeyHex = Buffer.from("device_auth_key_for_tests", "utf8").toString("hex");
  const version = 0x02;
  const flags = 0;
  const timeSlot = 123;
  const tokenPrefixHex = "aabbccddeeff00112233445566778899";

  function computeMacHex(): string {
    const key = Buffer.from(deviceAuthKeyHex, "hex");
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(Buffer.from([version & 0xff, flags & 0xff]));
    hmac.update(encodeUint32BE(timeSlot));
    hmac.update(Buffer.from(tokenPrefixHex, "hex"));
    const fullMac = hmac.digest();
    return fullMac.subarray(0, 8).toString("hex");
  }

  it("accepts valid MAC for registered device", () => {
    const macHex = computeMacHex();

    const ok = verifyPacketMac({
      deviceAuthKeyHex,
      version,
      flags,
      timeSlot,
      tokenPrefixHex,
      macHex,
    });

    expect(ok).toBe(true);
  });

  it("rejects invalid MAC for registered device", () => {
    const macHex = computeMacHex();

    const ok = verifyPacketMac({
      deviceAuthKeyHex,
      version,
      flags,
      timeSlot,
      tokenPrefixHex,
      macHex: macHex.replace(/^../, "ff"), // corrupt first byte
    });

    expect(ok).toBe(false);
  });
});

