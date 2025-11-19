import crypto from "crypto";
import { encodeUint32BE } from "./uint"; // we'll add a tiny helper

const LOCAL_BEACON_CONTEXT = "hnnp_v2_local_nonce";

/**
 * Compute a local_beacon_nonce for a given receiver and time_slot.
 *
 * Exact mechanism is non-normative; this implementation uses:
 *
 *   local_beacon_nonce = HMAC-SHA256(receiver_secret,
 *                         encode_uint32(time_slot) || "hnnp_v2_local_nonce")
 *
 * and returns the first 16 bytes as hex.
 */
export function computeLocalBeaconNonceHex(receiverSecret: string, timeSlot: number): string {
  const hmac = crypto.createHmac("sha256", Buffer.from(receiverSecret, "utf8"));
  hmac.update(encodeUint32BE(timeSlot));
  hmac.update(Buffer.from(LOCAL_BEACON_CONTEXT, "utf8"));
  const full = hmac.digest();
  return full.subarray(0, 16).toString("hex");
}

