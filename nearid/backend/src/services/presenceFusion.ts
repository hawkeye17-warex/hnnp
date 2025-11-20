export interface PresenceFusionEvent {
  org_id: string;
  device_id: string;
  receiver_id: string;
  timestamp: number;
  time_slot: number;
  token_prefix?: string;
  mac?: string;
  suspicious_duplicate?: boolean;
  suspicious_flags?: string[];
}

export interface PresenceFusionContext {
  orgId: string;
  deviceId: string;
  receiverId: string;
  timestamp: number;
  timeSlot: number;
}

export interface PresenceFusionConfig {
  duplicateSuppressSeconds: number;
  impossibleTravelSeconds: number;
  hardenedMode: boolean;
}

export interface PresenceFusionResult {
  shouldReject: boolean;
  rejectStatus?: number;
  rejectError?: string;
  suspiciousDuplicate: boolean;
  suspiciousFlags: string[];
}

/**
 * evaluatePresenceFusion encapsulates Cloud-side "presence fusion" logic:
 *
 * - Deduplicate reports for the same (org_id, device_id, receiver_id, time_slot)
 *   within a suppression window.
 * - Detect impossible movement when the same device appears at different receivers
 *   within an unrealistically short time.
 * - Optionally reject suspicious reports when hardened mode is enabled.
 *
 * This helper is intentionally stateless; callers pass the current history of
 * PresenceFusionEvent items and the function returns a decision for the new report.
 */
export function evaluatePresenceFusion(
  events: PresenceFusionEvent[],
  ctx: PresenceFusionContext,
  config: PresenceFusionConfig,
  baseSuspiciousFlags: string[] = [],
): PresenceFusionResult {
  const { orgId, deviceId, receiverId, timestamp, timeSlot } = ctx;
  const { duplicateSuppressSeconds, impossibleTravelSeconds, hardenedMode } = config;

  let suspiciousDuplicate = false;
  const suspiciousFlags = [...baseSuspiciousFlags];

  // 1) Deduplicate events for (org_id, device_id, receiver_id, time_slot) within a
  // configurable suppression window. This enforces the Cloud anti-replay rule that
  // only the first presence in a slot is treated as normal, and very quick repeats
  // are rejected outright.
  const matchingEvents = events.filter(
    (evt) =>
      evt.org_id === orgId &&
      evt.device_id === deviceId &&
      evt.receiver_id === receiverId &&
      evt.time_slot === timeSlot,
  );

  if (matchingEvents.length > 0) {
    const latest = matchingEvents.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
    const deltaSeconds = timestamp - latest.timestamp;

    if (deltaSeconds < duplicateSuppressSeconds) {
      return {
        shouldReject: true,
        rejectStatus: 409,
        rejectError: "Duplicate presence event in same time_slot",
        suspiciousDuplicate: false,
        suspiciousFlags,
      };
    }

    suspiciousDuplicate = true;
    suspiciousFlags.push("duplicate_same_slot");
  }

  // 2) Impossible movement heuristic across receivers: if the same device appears
  // at a different receiver within an "impossible travel" window, mark it as
  // suspicious (wormhole candidate).
  const lastDeviceEvent = events
    .filter((evt) => evt.org_id === orgId && evt.device_id === deviceId)
    .reduce<PresenceFusionEvent | null>((latest, evt) => {
      if (!latest || evt.timestamp > latest.timestamp) {
        return evt;
      }
      return latest;
    }, null);

  if (lastDeviceEvent && lastDeviceEvent.receiver_id !== receiverId) {
    const deltaSeconds = timestamp - lastDeviceEvent.timestamp;
    if (deltaSeconds >= 0 && deltaSeconds < impossibleTravelSeconds) {
      suspiciousFlags.push("impossible_movement");
    }
  }

  // 3) Hardened mode: when enabled, reject any presence that is marked as a
  // duplicate or has suspicious flags set, rather than merely recording it.
  if (hardenedMode && (suspiciousDuplicate || suspiciousFlags.length > 0)) {
    return {
      shouldReject: true,
      rejectStatus: 409,
      rejectError: "Suspicious presence event",
      suspiciousDuplicate,
      suspiciousFlags,
    };
  }

  return {
    shouldReject: false,
    suspiciousDuplicate,
    suspiciousFlags,
  };
}
