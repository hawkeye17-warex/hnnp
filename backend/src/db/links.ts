import crypto from "crypto";
import type { Link } from "@prisma/client";
import { prisma } from "./prisma";

export interface CreateLinkInput {
  orgId: string;
  deviceId?: string | null;
  userRef?: string | null;
  status?: string;
  activatedAt?: Date | null;
  revokedAt?: Date | null;
  id?: string;
}

export async function createLink(input: CreateLinkInput): Promise<Link> {
  const {
    orgId,
    deviceId,
    userRef,
    status = "pending",
    activatedAt = null,
    revokedAt = null,
    id,
  } = input;

  const linkId = id ?? crypto.randomUUID();

  return prisma.link.create({
    data: {
      id: linkId,
      orgId,
      deviceId: deviceId ?? null,
      userRef: userRef ?? null,
      status,
      activatedAt: activatedAt ?? undefined,
      revokedAt: revokedAt ?? undefined,
    },
  });
}

export async function activateLink(id: string, activatedAt: Date = new Date()): Promise<Link | null> {
  try {
    return await prisma.link.update({
      where: { id },
      data: {
        status: "active",
        activatedAt,
      },
    });
  } catch {
    return null;
  }
}

export async function revokeLink(id: string, revokedAt: Date = new Date()): Promise<Link | null> {
  try {
    return await prisma.link.update({
      where: { id },
      data: {
        status: "revoked",
        revokedAt,
      },
    });
  } catch {
    return null;
  }
}

export interface FindActiveLinkParams {
  orgId: string;
  deviceId?: string | null;
  userRef?: string | null;
}

export async function findActiveLinkByDeviceOrUserRef(
  params: FindActiveLinkParams,
): Promise<Link | null> {
  const { orgId, deviceId, userRef } = params;

  const orConditions = [];
  if (deviceId) {
    orConditions.push({ deviceId });
  }
  if (userRef) {
    orConditions.push({ userRef });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return prisma.link.findFirst({
    where: {
      orgId,
      status: "active",
      revokedAt: null,
      OR: orConditions,
    },
    orderBy: { activatedAt: "desc" },
  });
}

