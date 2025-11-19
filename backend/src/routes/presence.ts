import { Router, Request, Response } from "express";
import { verifyReceiverSignature } from "../services/crypto";
import { resolveLink } from "../services/links";
import { getReceiverSecret } from "../services/receivers";

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
  receiver_id: string;
  timestamp: number;
  time_slot: number;
  version: number;
  flags: number;
  token_prefix: string;
  mac: string;
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

  const eventId = `evt_${presenceEvents.length + 1}`;

  const event: PresenceEvent = {
    event_id: eventId,
    org_id,
    receiver_id,
    timestamp,
    time_slot,
    version,
    flags,
    token_prefix,
    mac,
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
