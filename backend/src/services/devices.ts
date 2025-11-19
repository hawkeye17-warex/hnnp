export interface DeviceRecord {
  deviceId: string;
  deviceIdBase: string;
  orgId: string | null;
  firstSeenAt: number;
  registered: boolean;
}

const devicesByKey = new Map<string, DeviceRecord>();

function makeKey(orgId: string | null, deviceIdBase: string): string {
  return `${orgId ?? "global"}:${deviceIdBase}`;
}

/**
 * Get or create a DeviceRecord for a given (orgId, device_id_base, device_id).
 *
 * This is an in-memory stand-in for the `devices` table described in
 * protocol/spec.md Section 11 (Data Model). A real implementation would
 * persist this to PostgreSQL.
 */
export function getOrCreateDevice(params: {
  orgId: string | null;
  deviceIdBase: string;
  deviceId: string;
}): DeviceRecord {
  const { orgId, deviceIdBase, deviceId } = params;
  const key = makeKey(orgId, deviceIdBase);
  const existing = devicesByKey.get(key);

  if (existing) {
    return existing;
  }

  const now = Date.now();

  const record: DeviceRecord = {
    deviceId,
    deviceIdBase,
    orgId,
    firstSeenAt: now,
    registered: false,
  };

  devicesByKey.set(key, record);
  return record;
}

export function listDevices(): DeviceRecord[] {
  return Array.from(devicesByKey.values());
}

