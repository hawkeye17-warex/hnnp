import crypto from "crypto";
import { prisma } from "../db/prisma";

export interface ResolveLinkParams {
  orgId: string;
  deviceId: string | null;
}

export interface ResolveLinkResult {
  linked: boolean;
  linkId?: string;
  userRef?: string | null;
}

export interface LinkRecord {
  id: string;
  orgId: string;
  deviceId: string | null;
  userRef: string | null;
  status: string;
  createdAt: number;
  activatedAt?: number | null;
  revokedAt?: number | null;
}

export async function createLink(params: {
  orgId: string;
  deviceId: string;
  userRef: string;
}): Promise<LinkRecord> {
  const now = new Date();
  const link = await prisma.link.create({
    data: {
      id: crypto.randomUUID(),
      orgId: params.orgId,
      deviceId: params.deviceId,
      userRef: params.userRef,
      status: "active",
      activatedAt: now,
      revokedAt: null,
    },
  });

  return {
    id: link.id,
    orgId: link.orgId,
    deviceId: link.deviceId,
    userRef: link.userRef,
    status: link.status,
    createdAt: link.createdAt.getTime(),
    activatedAt: link.activatedAt?.getTime() ?? null,
    revokedAt: link.revokedAt?.getTime() ?? null,
  };
}

export async function activateLink(id: string, activatedAt: Date = new Date()): Promise<LinkRecord | null> {
  try {
    const link = await prisma.link.update({
      where: { id },
      data: { status: "active", activatedAt, revokedAt: null },
    });

    return {
      id: link.id,
      orgId: link.orgId,
      deviceId: link.deviceId,
      userRef: link.userRef,
      status: link.status,
      createdAt: link.createdAt.getTime(),
      activatedAt: link.activatedAt?.getTime() ?? null,
      revokedAt: link.revokedAt?.getTime() ?? null,
    };
  } catch {
    return null;
  }
}

export async function revokeLink(params: { orgId?: string; linkId: string }): Promise<LinkRecord | null> {
  try {
    const existing = await prisma.link.findUnique({ where: { id: params.linkId } });
    if (!existing) {
      return null;
    }
    if (params.orgId && existing.orgId !== params.orgId) {
      return null;
    }

    const link = await prisma.link.update({
      where: { id: params.linkId },
      data: { status: "revoked", revokedAt: new Date() },
    });

    return {
      id: link.id,
      orgId: link.orgId,
      deviceId: link.deviceId,
      userRef: link.userRef,
      status: link.status,
      createdAt: link.createdAt.getTime(),
      activatedAt: link.activatedAt?.getTime() ?? null,
      revokedAt: link.revokedAt?.getTime() ?? null,
    };
  } catch {
    return null;
  }
}

// resolveLink looks up an active link for (orgId, deviceId), ignoring revoked links.
export async function resolveLink(params: ResolveLinkParams): Promise<ResolveLinkResult> {
  const { orgId, deviceId } = params;
  if (!deviceId) {
    return { linked: false };
  }

  const link = await prisma.link.findFirst({
    where: {
      orgId,
      deviceId,
      status: "active",
      revokedAt: null,
    },
    orderBy: { activatedAt: "desc" },
  });

  if (!link) {
    return { linked: false };
  }

  return {
    linked: true,
    linkId: link.id,
    userRef: link.userRef,
  };
}

export async function listLinks(params?: { orgId?: string; userRef?: string }): Promise<LinkRecord[]> {
  const where: Record<string, unknown> = {};
  if (params?.orgId) where.orgId = params.orgId;
  if (params?.userRef) where.userRef = params.userRef;

  const links = await prisma.link.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return links.map((l) => ({
    id: l.id,
    orgId: l.orgId,
    deviceId: l.deviceId,
    userRef: l.userRef,
    status: l.status,
    createdAt: l.createdAt.getTime(),
    activatedAt: l.activatedAt?.getTime() ?? null,
    revokedAt: l.revokedAt?.getTime() ?? null,
  }));
}
