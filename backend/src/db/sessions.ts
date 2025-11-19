import crypto from "crypto";
import type { PresenceSession, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface CreatePresenceSessionInput {
  orgId: string;
  receiverId: string;
  userRef?: string | null;
  deviceIdHash?: string | null;
  startedAt?: Date;
  flags?: number;
  meta?: Prisma.JsonValue;
  id?: string;
}

export async function createPresenceSession(
  input: CreatePresenceSessionInput,
): Promise<PresenceSession> {
  const {
    orgId,
    receiverId,
    userRef,
    deviceIdHash,
    startedAt,
    flags = 0,
    meta,
    id,
  } = input;

  const sessionId = id ?? crypto.randomUUID();

  return prisma.presenceSession.create({
    data: {
      id: sessionId,
      orgId,
      receiverId,
      userRef: userRef ?? null,
      deviceIdHash: deviceIdHash ?? null,
      startedAt: startedAt ?? new Date(),
      flags,
      meta: meta ?? undefined,
    },
  });
}

export interface EndPresenceSessionInput {
  id: string;
  endedAt?: Date;
  flags?: number;
  meta?: Prisma.JsonValue;
}

export async function endPresenceSession(
  input: EndPresenceSessionInput,
): Promise<PresenceSession | null> {
  const { id, endedAt, flags, meta } = input;

  try {
    return await prisma.presenceSession.update({
      where: { id },
      data: {
        endedAt: endedAt ?? new Date(),
        flags: typeof flags === "number" ? flags : undefined,
        meta: meta ?? undefined,
      },
    });
  } catch {
    return null;
  }
}

export interface FindOpenSessionsParams {
  orgId: string;
  receiverId?: string;
}

export async function findOpenSessionsForOrg(
  params: FindOpenSessionsParams,
): Promise<PresenceSession[]> {
  const { orgId, receiverId } = params;

  return prisma.presenceSession.findMany({
    where: {
      orgId,
      receiverId: receiverId ?? undefined,
      endedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });
}

