import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { verifyReceiverSignature, deriveDeviceIds, verifyPacketMac, deriveTokenPrefixWithNonce } from "../services/crypto";
import { resolveLink } from "../services/links";
import { getReceiverSecret } from "../services/receivers";
import { getOrCreateDevice, getDeviceKey } from "../services/devices";
import { emitWebhook } from "../services/webhooks";
import { computeLocalBeaconNonceHex } from "../services/localBeacon";
import { evaluatePresenceFusion, PresenceFusionEvent } from "../services/presenceFusion";
import {
  createPresenceSession,
  endPresenceSession,
  findOpenSessionsForOrg,
  touchPresenceSession,
} from "../db/sessions";
import { prisma } from "../db/prisma";
import { computeTokenHash } from "../security/tokenHash";

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
  anonymous?: boolean;
  policy?: string;
}

// In-memory presence store for now; will be replaced with a real database later.
const presenceEvents: PresenceEvent[] = [];

// Retention cap for in-memory presenceEvents per device_id.
// This is a reference-implementation safeguard to prevent unbounded growth
// when running without a real database.
const MAX_EVENTS_PER_DEVICE = 50;

const SESSION_TIMEOUT_MS =
  Number.isFinite(Number(process.env.PRESENCE_SESSION_TIMEOUT_MS))
    ? Number(process.env.PRESENCE_SESSION_TIMEOUT_MS)
    : 5 * 60 * 1000;

const router = Router();

async function logPresenceEvent(params: {
  orgId: string;
  receiverId: string;
  deviceIdHash?: string | null;
  userRef?: string | null;
  timestamp: number;
  timeSlot: number;
  version: number;
  flags: number;
  tokenPrefix: string;
  macHex?: string | null;
  signatureHex?: string | null;
  isAnonymous: boolean;
  authResult: string;
  reason?: string;
  meta?: Prisma.JsonValue;
}) {
  const clientTimestampMs = BigInt(Math.floor(params.timestamp * 1000));
  const replayKey = `${params.orgId}:${params.receiverId}:${params.tokenPrefix.toLowerCase()}:${params.timeSlot}`;
  const tokenHash = computeTokenHash(replayKey);

  await prisma.presenceEvent.create({
    data: {
      orgId: params.orgId,
      receiverId: params.receiverId,
      deviceIdHash: params.deviceIdHash ?? null,
      userRef: params.userRef ?? null,
      clientTimestampMs,
      timeSlot: params.timeSlot,
      version: params.version,
      flags: params.flags,
      tokenPrefix: params.tokenPrefix.toLowerCase(),
      tokenHash,
      macHex: params.macHex ?? null,
      signatureHex: params.signatureHex ?? null,
      isAnonymous: params.isAnonymous,
      authResult: params.authResult,
      reason: params.reason,
      meta: params.meta ?? undefined,
    },
  });
}

function getLastSeenMsFromMeta(meta: unknown, startedAt: Date): number {
  if (meta && typeof meta === "object" && meta !== null && "lastSeenAt" in meta) {
    const value = (meta as Record<string, unknown>).lastSeenAt;
    if (typeof value === "string") {
      const d = new Date(value);
      const t = d.getTime();
      if (Number.isFinite(t)) {
        return t;
      }
    }
  }
  return startedAt.getTime();
}

async function upsertPresenceSessionForEvent(params: {
  orgId: string;
  receiverId: string;
  deviceIdHash: string;
  userRef?: string | null;
  eventTimestampMs: number;
}): Promise<string> {
  const { orgId, receiverId, deviceIdHash, userRef, eventTimestampMs } = params;
  const openSessions = await findOpenSessionsForOrg({ orgId, deviceIdHash });
  const nowMs = eventTimestampMs;

  for (const sess of openSessions) {
    const lastSeenMs = getLastSeenMsFromMeta(sess.meta, sess.startedAt);
    if (nowMs - lastSeenMs > SESSION_TIMEOUT_MS) {
      await endPresenceSession({
        id: sess.id,
        endedAt: new Date(lastSeenMs + SESSION_TIMEOUT_MS),
      });
      continue;
    }

    const updatedMeta = {
      ...(typeof sess.meta === "object" && sess.meta !== null ? sess.meta : {}),
      lastSeenAt: new Date(nowMs).toISOString(),
    };

    await touchPresenceSession({
      id: sess.id,
      receiverId,
      userRef: userRef ?? sess.userRef ?? null,
      meta: updatedMeta,
    });

    return sess.id;
  }

  const created = await createPresenceSession({
    orgId,
    receiverId,
    userRef: userRef ?? null,
    deviceIdHash,
    startedAt: new Date(nowMs),
    flags: 0,
    meta: { lastSeenAt: new Date(nowMs).toISOString() },
  });

  return created.id;
}

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

  const org = await prisma.org.findUnique({ where: { id: org_id } });
  const receiverRecord = await prisma.receiver.findFirst({
    where: { id: receiver_id, orgId: org_id },
  });

  if (!org || !receiverRecord) {
    return res.status(404).json({ error: "Unknown org or receiver" });
  }

  const receiverSecret = getReceiverSecret(org.id, receiverRecord.id);
  if (!receiverSecret) {
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: null,
      signatureHex: signature,
      isAnonymous: true,
      authResult: "rejected_receiver_secret",
      reason: "Unknown receiver or secret not configured",
      meta: { error: "receiver_secret_not_configured" },
    });
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
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: null,
      signatureHex: signature,
      isAnonymous: true,
      authResult: "rejected_signature",
      reason: "Invalid receiver signature",
      meta: { error: "invalid_receiver_signature" },
    });
    return res.status(401).json({ error: "Invalid receiver signature" });
  }

  const maxSkewSeconds = Number.isFinite(Number(process.env.MAX_SKEW_SECONDS))
    ? Number(process.env.MAX_SKEW_SECONDS)
    : 120;

  const serverTime = Math.floor(Date.now() / 1000);
  if (Math.abs(serverTime - timestamp) > maxSkewSeconds) {
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: null,
      signatureHex: signature,
      isAnonymous: true,
      authResult: "rejected_window",
      reason: "Timestamp skew too large",
      meta: { error: "timestamp_skew_too_large" },
    });
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
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: null,
      signatureHex: signature,
      isAnonymous: true,
      authResult: "rejected_window",
      reason: "time_slot outside allowed drift window",
      meta: { error: "time_slot_outside_drift_window" },
    });
    return res.status(400).json({ error: "time_slot outside allowed drift window" });
  }

  const deviceIdSalt = process.env.DEVICE_ID_SALT;
  if (!deviceIdSalt) {
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: null,
      signatureHex: signature,
      isAnonymous: true,
      authResult: "rejected_server_config",
      reason: "device_id_salt not configured",
      meta: { error: "device_id_salt_not_configured" },
    });
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
      await logPresenceEvent({
        orgId: org.id,
        receiverId: receiverRecord.id,
        deviceIdHash: deviceRecord.deviceId,
        timestamp,
        timeSlot: time_slot,
        version,
        flags,
        tokenPrefix: token_prefix,
        macHex: mac,
        signatureHex: signature,
        isAnonymous: true,
        authResult: "rejected_mac",
        reason: "Invalid MAC for registered device",
        meta: { error: "invalid_mac" },
      });
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
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      deviceIdHash: deviceRecord.deviceId,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: deviceKey ? mac : null,
      signatureHex: signature,
      isAnonymous: true,
      authResult:
        fusionResult.rejectError === "Duplicate presence event in same time_slot"
          ? "ignored_duplicate"
          : "rejected_suspicious",
      reason: fusionResult.rejectError,
      meta: {
        error: "presence_fusion_reject",
        suspicious_flags: fusionResult.suspiciousFlags,
      },
    });
    return res.status(fusionResult.rejectStatus).json({ error: fusionResult.rejectError });
  }

  suspiciousDuplicate = fusionResult.suspiciousDuplicate;
  suspiciousFlags = fusionResult.suspiciousFlags;

  const linkResult = resolveLink({
    orgId: org_id,
    deviceId: deviceRecord.deviceId,
  });

  const anonModeRaw = process.env.ANON_MODE ?? "allow";
  const anonMode = anonModeRaw.toLowerCase();

  if (!linkResult.linked && anonMode === "block") {
    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      deviceIdHash: deviceRecord.deviceId,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: deviceKey ? mac : null,
      signatureHex: signature,
      isAnonymous: true,
      authResult: "rejected_anonymous_blocked",
      reason: "Anonymous devices are blocked by policy",
      meta: {
        error: "anonymous_blocked_by_policy",
        anon_mode: anonMode,
      },
    });
    return res.status(403).json({ error: "Anonymous devices are blocked by policy" });
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
    anonymous: !linkResult.linked && anonMode === "warn" ? true : undefined,
    policy: !linkResult.linked && anonMode === "warn" ? "warn" : undefined,
    suspicious_duplicate: suspiciousDuplicate || undefined,
    suspicious_flags: suspiciousFlags.length > 0 ? suspiciousFlags : undefined,
  };

  presenceEvents.push(event);

  // Enforce per-device retention cap to prevent unbounded memory growth
  // in the reference in-memory implementation.
  const perDeviceEvents = presenceEvents
    .filter((e) => e.device_id === deviceRecord.deviceId)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (perDeviceEvents.length > MAX_EVENTS_PER_DEVICE) {
    const surplus = perDeviceEvents.length - MAX_EVENTS_PER_DEVICE;
    const toRemove = new Set(
      perDeviceEvents.slice(0, surplus).map((e) => e.event_id),
    );
    for (let i = presenceEvents.length - 1; i >= 0; i -= 1) {
      const e = presenceEvents[i];
      if (e.device_id === deviceRecord.deviceId && toRemove.has(e.event_id)) {
        presenceEvents.splice(i, 1);
      }
    }
  }

  // Persist presence session in DB (open/extend/timeout handling).
  const presenceSessionId = await upsertPresenceSessionForEvent({
    orgId: org_id,
    receiverId: receiver_id,
    deviceIdHash: deviceRecord.deviceId,
    userRef: linkResult.userRef ?? null,
    eventTimestampMs: timestamp * 1000,
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

    await logPresenceEvent({
      orgId: org.id,
      receiverId: receiverRecord.id,
      deviceIdHash: deviceRecord.deviceId,
      userRef: linkResult.userRef ?? null,
      timestamp,
      timeSlot: time_slot,
      version,
      flags,
      tokenPrefix: token_prefix,
      macHex: deviceKey ? mac : null,
      signatureHex: signature,
      isAnonymous: false,
      authResult: "accepted",
      meta: {
        linked: true,
        link_id: linkResult.linkId,
        presence_session_id: presenceSessionId,
        suspicious_duplicate: suspiciousDuplicate,
        suspicious_flags: suspiciousFlags,
      },
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
    presence_session_id: presenceSessionId,
    receiver_id,
    timestamp,
  });

  await logPresenceEvent({
    orgId: org.id,
    receiverId: receiverRecord.id,
    deviceIdHash: deviceRecord.deviceId,
    userRef: null,
    timestamp,
    timeSlot: time_slot,
    version,
    flags,
    tokenPrefix: token_prefix,
    macHex: deviceKey ? mac : null,
    signatureHex: signature,
    isAnonymous: true,
    authResult: "accepted",
    meta: {
      linked: false,
      presence_session_id: presenceSessionId,
      suspicious_duplicate: suspiciousDuplicate,
      suspicious_flags: suspiciousFlags,
    },
  });

  return res.status(200).json({
    status: "accepted",
    linked: false,
    event_id: eventId,
    presence_session_id: presenceSessionId,
  });
});

export { router as presenceRouter, presenceEvents };
