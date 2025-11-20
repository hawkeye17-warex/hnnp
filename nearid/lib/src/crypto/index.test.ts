import crypto from "crypto";
import { constantTimeEqual, decodeUint32, encodeUint32, hmacSha256 } from ".";

describe("lib/crypto hmacSha256", () => {
  it("matches Node crypto HMAC-SHA256 for known inputs", () => {
    const key = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const data = new Uint8Array([10, 20, 30, 40, 50]);

    const expected = crypto
      .createHmac("sha256", Buffer.from(key))
      .update(Buffer.from(data))
      .digest();

    const actual = Buffer.from(hmacSha256(key, data));

    expect(actual.equals(expected)).toBe(true);
  });
});

describe("lib/crypto constantTimeEqual", () => {
  it("returns true for equal arrays", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it("returns false for different arrays or lengths", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([3, 2, 1]))).toBe(false);
  });
});

describe("lib/crypto uint32 encode/decode", () => {
  it("round-trips uint32 values", () => {
    const values = [0, 1, 42, 2 ** 32 - 1];
    for (const v of values) {
      const encoded = encodeUint32(v);
      expect(encoded).toHaveLength(4);
      const decoded = decodeUint32(encoded);
      expect(decoded).toBe(v);
    }
  });

  it("encodes in big-endian order", () => {
    const encoded = encodeUint32(0x01020304);
    expect(Array.from(encoded)).toEqual([1, 2, 3, 4]);
  });
});

