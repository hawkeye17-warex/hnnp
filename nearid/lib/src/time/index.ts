/**
 * Get current Unix time in seconds (UTC).
 */
export function getUnixTime(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Compute time_slot = floor(unixTime / windowSeconds).
 *
 * By default windowSeconds = 15, matching the token rotation window
 * defined in the protocol specification.
 */
export function computeTimeSlot(unixTime: number, windowSeconds = 15): number {
  if (!Number.isFinite(unixTime) || unixTime < 0) {
    throw new Error(`computeTimeSlot: invalid unixTime ${unixTime}`);
  }
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    throw new Error(`computeTimeSlot: invalid windowSeconds ${windowSeconds}`);
  }

  return Math.floor(unixTime / windowSeconds);
}

/**
 * Check whether a reported time_slot is within an allowed drift (in slots)
 * of the server's computed time_slot.
 *
 * For example, with maxDriftSlots = 1, reportSlot is accepted if it is
 * serverSlot, serverSlot - 1, or serverSlot + 1.
 */
export function isTimeSlotWithinDrift(
  reportSlot: number,
  serverSlot: number,
  maxDriftSlots = 1
): boolean {
  if (!Number.isFinite(reportSlot) || !Number.isFinite(serverSlot)) {
    return false;
  }
  if (!Number.isFinite(maxDriftSlots) || maxDriftSlots < 0) {
    return false;
  }

  const diff = Math.abs(reportSlot - serverSlot);
  return diff <= maxDriftSlots;
}

