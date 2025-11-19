import crypto from "crypto";
import type { Device, DeviceKey } from "@prisma/client";
import { prisma } from "./prisma";

export interface CreateDeviceInput {
  orgId: string;
  displayName?: string | null;
  status?: string;
}

export async function createDevice(input: CreateDeviceInput): Promise<Device> {
  const { orgId, displayName, status } = input;
  return prisma.device.create({
    data: {
      orgId,
      displayName: displayName ?? undefined,
      status: status ?? "active",
    },
  });
}

export async function getDeviceById(id: string): Promise<Device | null> {
  return prisma.device.findUnique({ where: { id } });
}

export async function listDevicesForOrg(orgId: string): Promise<Device[]> {
  return prisma.device.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateDeviceKeyInput {
  deviceId: string;
  keyHash: string;
  algorithm: string;
  id?: string;
}

export async function createDeviceKey(input: CreateDeviceKeyInput): Promise<DeviceKey> {
  const { deviceId, keyHash, algorithm, id } = input;
  const deviceKeyId = id ?? crypto.randomUUID();

  return prisma.deviceKey.create({
    data: {
      id: deviceKeyId,
      deviceId,
      keyHash,
      algorithm,
    },
  });
}

export async function getActiveDeviceKey(deviceId: string): Promise<DeviceKey | null> {
  return prisma.deviceKey.findFirst({
    where: { deviceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function touchDeviceKeyLastUsed(
  id: string,
  at: Date = new Date(),
): Promise<DeviceKey | null> {
  try {
    return await prisma.deviceKey.update({
      where: { id },
      data: { lastUsedAt: at },
    });
  } catch {
    return null;
  }
}

