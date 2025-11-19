import crypto from "crypto";
import { prisma } from "../db/prisma";
import { createDevice, createDeviceKey, getActiveDeviceKey, getDeviceById } from "../db/devices";

export interface DeviceRecord {
  deviceId: string;
  deviceIdBase: string;
  orgId: string;
  firstSeenAt: number;
  registered: boolean;
}

export interface DeviceKeyRecord {
  orgId: string;
  deviceId: string;
  deviceAuthKeyHex: string;
  registrationAt: number;
}

export async function getOrCreateDevice(params: {
  orgId: string;
  deviceIdBase: string;
  deviceId: string;
}): Promise<DeviceRecord> {
  const { orgId, deviceIdBase, deviceId } = params;
  const existing = await getDeviceById(deviceId);
  if (existing) {
    const existingKey = await getActiveDeviceKey(existing.id);
    return {
      deviceId: existing.id,
      deviceIdBase,
      orgId: existing.orgId,
      firstSeenAt: existing.createdAt.getTime(),
      registered: !!existingKey,
    };
  }

  const created = await createDevice({
    id: deviceId,
    orgId,
  });

  return {
    deviceId: created.id,
    deviceIdBase,
    orgId: created.orgId,
    firstSeenAt: created.createdAt.getTime(),
    registered: false,
  };
}

export async function registerDeviceKey(params: {
  orgId: string;
  deviceId: string;
  deviceAuthKeyHex: string;
}): Promise<DeviceKeyRecord> {
  const { orgId, deviceId, deviceAuthKeyHex } = params;

  // Ensure device exists
  await getOrCreateDevice({ orgId, deviceIdBase: "", deviceId });

  const record = await createDeviceKey({
    id: crypto.randomUUID(),
    deviceId,
    keyHash: deviceAuthKeyHex,
    algorithm: "hmac_sha256",
  });

  return {
    orgId,
    deviceId,
    deviceAuthKeyHex: record.keyHash,
    registrationAt: record.createdAt.getTime(),
  };
}

export async function getDeviceKey(params: {
  orgId: string;
  deviceId: string;
}): Promise<DeviceKeyRecord | null> {
  const record = await getActiveDeviceKey(params.deviceId);
  if (!record) {
    return null;
  }
  return {
    orgId: params.orgId,
    deviceId: params.deviceId,
    deviceAuthKeyHex: record.keyHash,
    registrationAt: record.createdAt.getTime(),
  };
}

export async function listDevices(): Promise<DeviceRecord[]> {
  const devices = await prisma.device.findMany({ orderBy: { createdAt: "desc" } });
  const results: DeviceRecord[] = [];
  for (const d of devices) {
    const key = await getActiveDeviceKey(d.id);
    results.push({
      deviceId: d.id,
      deviceIdBase: "",
      orgId: d.orgId,
      firstSeenAt: d.createdAt.getTime(),
      registered: !!key,
    });
  }
  return results;
}

export async function listDeviceKeys(): Promise<DeviceKeyRecord[]> {
  const keys = await prisma.deviceKey.findMany({ orderBy: { createdAt: "desc" } });
  return keys.map((k) => ({
    orgId: "",
    deviceId: k.deviceId,
    deviceAuthKeyHex: k.keyHash,
    registrationAt: k.createdAt.getTime(),
  }));
}
