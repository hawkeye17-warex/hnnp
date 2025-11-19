import { Router, Request, Response } from "express";
import { verifyReceiverSignature, deriveDeviceIds, verifyPacketMac } from "../services/crypto";
import { resolveLink } from "../services/links";
import { getReceiverSecret } from "../services/receivers";
import { getOrCreateDevice, getDeviceKey } from "../services/devices";

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

interface PresenceEvent {
  event_id: string;
  org_id: string;
  device_id: string;
  device_id_base: string;
  receiver_id: string;
  timestamp: number;
  time_slot: number;
  version: number;
  flags: number;
  token_prefix: string;
  mac: string;
  suspicious_duplicate?: boolean;
}

// In-memory presence store for now; will be replaced with a real database later.
const presenceEvents: PresenceEvent[] = [];

const router = Router();

router.post("/v2/presence", (req: Request, res: Response) => {
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
  // server_slot = floor(server_time / 15); accept if |time_slot - server_slot| <= 1.
  const rotationWindowSeconds = 15;
  const serverSlot = Math.floor(serverTime / rotationWindowSeconds);
  if (Math.abs(serverSlot - time_slot) > 1) {
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
  }

  // Anti-replay enforcement for (org_id, device_id, receiver_id, time_slot).
  // First valid event is accepted as normal. Subsequent events with the same tuple
  // in the same time_slot are either rejected or accepted but flagged as duplicates.
  // We allow a second attempt if timestamp >= previous_timestamp + MIN_DUP_RETRY_SECONDS
  // (default 5 seconds).
  const minDupRetrySeconds = Number.isFinite(Number(process.env.MIN_DUP_RETRY_SECONDS))
    ? Number(process.env.MIN_DUP_RETRY_SECONDS)
    : 5;

  const matchingEvents = presenceEvents.filter(
    (evt) =>
      evt.org_id === org_id &&
      evt.device_id === deviceRecord.deviceId &&
      evt.receiver_id === receiver_id &&
      evt.time_slot === time_slot,
  );

  let suspiciousDuplicate = false;

  if (matchingEvents.length > 0) {
    const latest = matchingEvents.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
    const deltaSeconds = timestamp - latest.timestamp;

    if (deltaSeconds < minDupRetrySeconds) {
      return res.status(409).json({ error: "Duplicate presence event in same time_slot" });
    }

    suspiciousDuplicate = true;
  }

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
  };

  presenceEvents.push(event);

  const linkResult = resolveLink({
    orgId: org_id,
    deviceId: null,
  });

  if (linkResult.linked) {
    return res.status(200).json({
      status: "accepted",
      linked: true,
      event_id: eventId,
      link_id: linkResult.linkId,
      user_ref: linkResult.userRef,
    });
  }

  const presenceSessionId = `psess_${presenceEvents.length}`;

  return res.status(200).json({
    status: "accepted",
    linked: false,
    event_id: eventId,
    presence_session_id: presenceSessionId,
  });
});

export { router as presenceRouter, presenceEvents };
