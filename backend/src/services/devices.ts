export interface DeviceRecord {
  deviceId: string;
  deviceIdBase: string;
  orgId: string | null;
  firstSeenAt: number;
  registered: boolean;
}

export interface DeviceKeyRecord {
  orgId: string;
  deviceId: string;
  deviceAuthKeyHex: string;
  registrationAt: number;
}

const devicesByKey = new Map<string, DeviceRecord>();
const deviceKeysByKey = new Map<string, DeviceKeyRecord>();

function makeDeviceKey(orgId: string | null, deviceIdBase: string): string {
  return `${orgId ?? "global"}:${deviceIdBase}`;
}

function makeDeviceKeyKey(orgId: string, deviceId: string): string {
  return `${orgId}:${deviceId}`;
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
  const key = makeDeviceKey(orgId, deviceIdBase);
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

/**
 * Register a device_auth_key for a given (orgId, deviceId).
 *
 * This is an in-memory stand-in for the `device_keys` table from the spec.
 */
export function registerDeviceKey(params: {
  orgId: string;
  deviceId: string;
  deviceAuthKeyHex: string;
}): DeviceKeyRecord {
  const { orgId, deviceId, deviceAuthKeyHex } = params;
  const key = makeDeviceKeyKey(orgId, deviceId);

  const record: DeviceKeyRecord = {
    orgId,
    deviceId,
    deviceAuthKeyHex,
    registrationAt: Date.now(),
  };

  deviceKeysByKey.set(key, record);

  // Ensure the corresponding DeviceRecord is marked as registered.
  for (const device of devicesByKey.values()) {
    if (device.orgId === orgId && device.deviceId === deviceId) {
      device.registered = true;
    }
  }

  return record;
}

export function getDeviceKey(params: { orgId: string; deviceId: string }): DeviceKeyRecord | null {
  const key = makeDeviceKeyKey(params.orgId, params.deviceId);
  return deviceKeysByKey.get(key) ?? null;
}

export function listDevices(): DeviceRecord[] {
  return Array.from(devicesByKey.values());
}

export function listDeviceKeys(): DeviceKeyRecord[] {
  return Array.from(deviceKeysByKey.values());
}
