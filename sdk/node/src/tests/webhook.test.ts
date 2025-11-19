import { verifyWebhookSignature } from "../index";

describe("verifyWebhookSignature", () => {
  const secret = "webhook_secret_test";
  const timestamp = "1700000000";
  const rawBody = '{"hello":"world"}';

  it("accepts valid signature", () => {
    const crypto = require("crypto") as typeof import("crypto");
    const msg = Buffer.concat([Buffer.from(timestamp, "utf8"), Buffer.from(rawBody, "utf8")]);
    const expected = crypto.createHmac("sha256", Buffer.from(secret, "utf8")).update(msg).digest("hex");

    const result = verifyWebhookSignature({
      secret,
      timestamp,
      rawBody,
      signature: expected,
    });

    expect(result).toBe(true);
  });

  it("rejects invalid signature", () => {
    const result = verifyWebhookSignature({
      secret,
      timestamp,
      rawBody,
      signature: "deadbeef",
    });

    expect(result).toBe(false);
  });

  it("rejects when length differs", () => {
    const result = verifyWebhookSignature({
      secret,
      timestamp,
      rawBody,
      signature: "00",
    });

    expect(result).toBe(false);
  });
});

