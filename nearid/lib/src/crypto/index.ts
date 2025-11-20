import crypto from "crypto";

/**
 * Compute HMAC-SHA256 over `data` using the provided `key`.
 *
 * - key/data are raw bytes (Uint8Array).
 * - Returns raw 32-byte MAC as Uint8Array.
 *
 * This implementation targets Node.js. In React Native or other runtimes,
 * this module can be shimmed with an equivalent HMAC-SHA256 implementation
 * while preserving the same function signatures.
 */
export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const hmac = crypto.createHmac("sha256", Buffer.from(key));
  hmac.update(Buffer.from(data));
  const digest = hmac.digest();
  return new Uint8Array(digest);
}

/**
 * Constant-time equality check for two byte arrays.
 *
 * Returns false if lengths differ. When lengths are equal, uses
 * crypto.timingSafeEqual to avoid timing side channels.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Encode a 32-bit unsigned integer (number) as a 4-byte big-endian Uint8Array.
 */
export function encodeUint32(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`encodeUint32: invalid value ${value}`);
  }

  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value >>> 0, false); // big-endian
  return new Uint8Array(buffer);
}

/**
 * Decode a 4-byte big-endian Uint8Array into a 32-bit unsigned integer.
 */
export function decodeUint32(bytes: Uint8Array): number {
  if (bytes.length !== 4) {
    throw new Error(`decodeUint32: expected 4 bytes, got ${bytes.length}`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(0, false); // big-endian
}

