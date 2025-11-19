import crypto from "crypto";

export interface VerifyReceiverSignatureParams {
  receiverSecret: string;
  orgId: string;
  receiverId: string;
  timeSlot: number;
  tokenPrefix: string;
  timestamp: number;
  signature: string;
}

export interface DeriveDeviceIdsParams {
  deviceIdSalt: string;
  timeSlot: number;
  tokenPrefixHex: string;
}

function encodeUint32BE(value: number): Buffer {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`encodeUint32BE: invalid value ${value}`);
  }

  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(value >>> 0, 0);
  return buf;
}

function timingSafeEqualHex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

// verifyReceiverSignature implements the receiver signature check from protocol/spec.md:
//
// expected_signature = HMAC-SHA256(receiver_secret,
//   org_id || receiver_id || encode_uint32(time_slot) || token_prefix || encode_uint32(timestamp))
//
// Strings are encoded as UTF-8, integers as uint32 big-endian, and token_prefix is treated as hex.
export function verifyReceiverSignature(params: VerifyReceiverSignatureParams): boolean {
  const { receiverSecret, orgId, receiverId, timeSlot, tokenPrefix, timestamp, signature } = params;

  try {
    const hmac = crypto.createHmac("sha256", Buffer.from(receiverSecret, "utf8"));

    hmac.update(Buffer.from(orgId, "utf8"));
    hmac.update(Buffer.from(receiverId, "utf8"));
    hmac.update(encodeUint32BE(timeSlot));

    const tokenPrefixBytes = Buffer.from(tokenPrefix, "hex");
    hmac.update(tokenPrefixBytes);

    hmac.update(encodeUint32BE(timestamp));

    const expectedHex = hmac.digest("hex");

    return timingSafeEqualHex(expectedHex, signature);
  } catch {
    return false;
  }
}

// deriveDeviceIds implements the device_id_base and device_id derivation from protocol/spec.md:
//
// device_id_base = HMAC-SHA256(device_id_salt,
//                   encode_uint32(time_slot) || token_prefix)
//
// device_id = HMAC-SHA256(device_id_salt,
//               "hnnp_v2_id" || device_id_base)
//
// device_id_salt is provided as a string (e.g., env var) and interpreted as UTF-8 bytes.
// token_prefix is provided as a hex string.
export function deriveDeviceIds(params: DeriveDeviceIdsParams): {
  deviceIdBaseHex: string;
  deviceIdHex: string;
} {
  const { deviceIdSalt, timeSlot, tokenPrefixHex } = params;

  const key = Buffer.from(deviceIdSalt, "utf8");

  const hmacBase = crypto.createHmac("sha256", key);
  hmacBase.update(encodeUint32BE(timeSlot));
  hmacBase.update(Buffer.from(tokenPrefixHex, "hex"));
  const deviceIdBaseHex = hmacBase.digest("hex");

  const hmacId = crypto.createHmac("sha256", key);
  hmacId.update(Buffer.from("hnnp_v2_id", "utf8"));
  hmacId.update(Buffer.from(deviceIdBaseHex, "hex"));
  const deviceIdHex = hmacId.digest("hex");

  return { deviceIdBaseHex, deviceIdHex };
}

