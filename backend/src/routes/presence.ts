import { Router, Request, Response } from "express";
import { verifyReceiverSignature, deriveDeviceIds, verifyPacketMac, deriveTokenPrefixWithNonce } from "../services/crypto";
import { resolveLink } from "../services/links";
import { getReceiverSecret } from "../services/receivers";
import { getOrCreateDevice, getDeviceKey } from "../services/devices";
import { emitWebhook } from "../services/webhooks";
import { computeLocalBeaconNonceHex } from "../services/localBeacon";
import { evaluatePresenceFusion, PresenceFusionEvent } from "../services/presenceFusion";

interface PresenceRequestBody {
  org_id: string;
  receiver_id: string;
  timestamp: number;
  time_slot: number;
  version: number;
  flags: number;
  token_prefix: string;
  mac: string;
  signature: string;
}

interface PresenceEvent extends PresenceFusionEvent {
  event_id: string;
  device_id_base: string;
  version: number;
  flags: number;
}

// In-memory presence store for now; will be replaced with a real database later.
const presenceEvents: PresenceEvent[] = [];

export interface PresenceSession {
  presence_session_id: string;
  org_id: string;
  device_id: string;
  first_seen_at: number;
  last_seen_at: number;
  resolved_at?: number | null;
}

// In-memory presence session store for now; will be replaced with a real database later.
const presenceSessions: PresenceSession[] = [];

const router = Router();

router.post("/v2/presence", async (req: Request, res: Response) => {
  const body = req.body as Partial<PresenceRequestBody> | undefined;

  if (!body) {
    return res.status(400).json({ error: "Missing JSON body" });
  }

  const {
    org_id,
    receiver_id,
    timestamp,
    time_slot,
    version,
    flags,
    token_prefix,
    mac,
    signature,
  } = body;

  if (
    typeof org_id !== "string" ||
    typeof receiver_id !== "string" ||
    typeof timestamp !== "number" ||
    typeof time_slot !== "number" ||
    typeof version !== "number" ||
    typeof flags !== "number" ||
    typeof token_prefix !== "string" ||
    typeof mac !== "string" ||
    typeof signature !== "string"
  ) {
    return res.status(400).json({ error: "Invalid or missing fields in presence request" });
  }

  if (version !== 0x02) {
    return res.status(400).json({ error: "Unsupported version; expected 0x02" });
  }

  const receiverSecret = getReceiverSecret(org_id, receiver_id);
  if (!receiverSecret) {
    return res.status(401).json({ error: "Unknown receiver or secret not configured" });
  }

  const isValidSignature = verifyReceiverSignature({
    receiverSecret,
    orgId: org_id,
    receiverId: receiver_id,
    timeSlot: time_slot,
    tokenPrefix: token_prefix,
    timestamp,
    signature,
  });

  if (!isValidSignature) {
    return res.status(401).json({ error: "Invalid receiver signature" });
  }

  const maxSkewSeconds = Number.isFinite(Number(process.env.MAX_SKEW_SECONDS))
    ? Number(process.env.MAX_SKEW_SECONDS)
    : 120;

  const serverTime = Math.floor(Date.now() / 1000);
  if (Math.abs(serverTime - timestamp) > maxSkewSeconds) {
    return res.status(400).json({ error: "Timestamp skew too large" });
  }

  // Validate that reported time_slot is consistent with server-side time using 15-second windows.
  // server_slot = floor(server_time / 15); accept if |time_slot - server_slot| <= max_drift_slots.
  const rotationWindowSeconds = 15;
  const serverSlot = Math.floor(serverTime / rotationWindowSeconds);
  const maxDriftSlots = Number.isFinite(Number(process.env.MAX_DRIFT_SLOTS))
    ? Number(process.env.MAX_DRIFT_SLOTS)
    : 1;
  if (Math.abs(serverSlot - time_slot) > maxDriftSlots) {
    return res.status(400).json({ error: "time_slot outside allowed drift window" });
  }

  const deviceIdSalt = process.env.DEVICE_ID_SALT;
  if (!deviceIdSalt) {
    return res.status(500).json({ error: "device_id_salt not configured" });
  }

  const { deviceIdBaseHex, deviceIdHex } = deriveDeviceIds({
    deviceIdSalt,
    timeSlot: time_slot,
    tokenPrefixHex: token_prefix,
  });

  const deviceRecord = getOrCreateDevice({
    orgId: org_id,
    deviceIdBase: deviceIdBaseHex,
    deviceId: deviceIdHex,
  });

  // For registered devices (device_keys present), verify packet MAC using device_auth_key.
  // For unregistered devices, skip MAC verification and treat presence as low-trust anonymous.
  const deviceKey = getDeviceKey({ orgId: org_id, deviceId: deviceRecord.deviceId });

  // Anti-replay / anomaly flags are tracked below.
  let suspiciousDuplicate = false;
  let suspiciousFlags: string[] = [];

  if (deviceKey) {
    const macValid = verifyPacketMac({
      deviceAuthKeyHex: deviceKey.deviceAuthKeyHex,
      version,
      flags,
      timeSlot: time_slot,
      tokenPrefixHex: token_prefix,
      macHex: mac,
    });

    if (!macValid) {
      return res.status(401).json({ error: "Invalid MAC for registered device" });
    }

    // Optional local_beacon_nonce verification (wormhole mitigation).
    // When enabled, Cloud recomputes the expected token_prefix using a nonce derived
    // from (receiver_secret, time_slot) and verifies consistency.
    const localNonceEnabled =
      process.env.LOCAL_BEACON_NONCE_ENABLED === "true" ||
      process.env.LOCAL_BEACON_NONCE_ENABLED === "1";

    if (localNonceEnabled) {
      const localNonceHex = computeLocalBeaconNonceHex(receiverSecret, time_slot);
      const expectedPrefixHex = deriveTokenPrefixWithNonce({
        deviceAuthKeyHex: deviceKey.deviceAuthKeyHex,
        timeSlot: time_slot,
        localBeaconNonceHex: localNonceHex,
      });

      if (expectedPrefixHex !== token_prefix.toLowerCase()) {
        suspiciousFlags.push("local_beacon_nonce_mismatch");
      }
    }
  }

  const duplicateSuppressSeconds = Number.isFinite(
    Number(process.env.DUPLICATE_SUPPRESS_SECONDS ?? process.env.MIN_DUP_RETRY_SECONDS),
  )
    ? Number(process.env.DUPLICATE_SUPPRESS_SECONDS ?? process.env.MIN_DUP_RETRY_SECONDS)
    : 5;

  const impossibleTravelSeconds = Number.isFinite(Number(process.env.IMPOSSIBLE_TRAVEL_SECONDS))
    ? Number(process.env.IMPOSSIBLE_TRAVEL_SECONDS)
    : 60;

  const hardenedMode =
    process.env.HARDENED_MODE === "true" || process.env.HARDENED_MODE === "1";

  const fusionResult = evaluatePresenceFusion(
    presenceEvents,
    {
      orgId: org_id,
      deviceId: deviceRecord.deviceId,
      receiverId: receiver_id,
      timestamp,
      timeSlot: time_slot,
    },
    {
      duplicateSuppressSeconds,
      impossibleTravelSeconds,
      hardenedMode,
    },
    suspiciousFlags,
  );

  if (fusionResult.shouldReject && fusionResult.rejectStatus && fusionResult.rejectError) {
    return res.status(fusionResult.rejectStatus).json({ error: fusionResult.rejectError });
  }

  suspiciousDuplicate = fusionResult.suspiciousDuplicate;
  suspiciousFlags = fusionResult.suspiciousFlags;

  const eventId = `evt_${presenceEvents.length + 1}`;

  const event: PresenceEvent = {
    event_id: eventId,
    org_id,
    device_id: deviceRecord.deviceId,
    device_id_base: deviceRecord.deviceIdBase,
    receiver_id,
    timestamp,
    time_slot,
    version,
    flags,
    token_prefix,
    mac,
    suspicious_duplicate: suspiciousDuplicate || undefined,
    suspicious_flags: suspiciousFlags.length > 0 ? suspiciousFlags : undefined,
  };

  presenceEvents.push(event);

  // Create or update presence_session for this (org_id, device_id) if not already resolved.
  let session = presenceSessions.find(
    (s) => s.org_id === org_id && s.device_id === deviceRecord.deviceId && !s.resolved_at,
  );

  if (!session) {
    const presenceSessionId = `psess_${presenceSessions.length + 1}`;
    session = {
      presence_session_id: presenceSessionId,
      org_id,
      device_id: deviceRecord.deviceId,
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      resolved_at: null,
    };
    presenceSessions.push(session);
  } else {
    session.last_seen_at = timestamp;
  }

  const linkResult = resolveLink({
    orgId: org_id,
    deviceId: deviceRecord.deviceId,
  });

  if (linkResult.linked) {
    await emitWebhook(org_id, {
      type: "presence.check_in",
      event_id: eventId,
      org_id,
      device_id: deviceRecord.deviceId,
      link_id: linkResult.linkId,
      user_ref: linkResult.userRef,
      receiver_id,
      timestamp,
      suspicious: suspiciousFlags.length > 0 || suspiciousDuplicate,
    });

    return res.status(200).json({
      status: "accepted",
      linked: true,
      event_id: eventId,
      link_id: linkResult.linkId,
      user_ref: linkResult.userRef,
    });
  }

  await emitWebhook(org_id, {
    type: "presence.unknown",
    event_id: eventId,
    org_id,
    device_id: deviceRecord.deviceId,
    presence_session_id: session.presence_session_id,
    receiver_id,
    timestamp,
  });

  return res.status(200).json({
    status: "accepted",
    linked: false,
    event_id: eventId,
    presence_session_id: session.presence_session_id,
  });
});

export { router as presenceRouter, presenceEvents, presenceSessions };
