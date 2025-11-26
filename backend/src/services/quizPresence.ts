import { prisma } from "../db/prisma";

type PresenceCheckInput = {
  orgId: string;
  profileId?: string | null;
  userRef?: string | null;
  receiverId?: string | null;
  windowMinutes?: number;
  startTime?: Date;
  endTime?: Date;
};

export type PresenceCheckResult =
  | { ok: true; reason?: undefined }
  | { ok: false; reason: string };

/**
 * Checks whether a user/profile has a qualifying presence event for a quiz.
 * Defaults to the last 10 minutes and clamps to quiz start/end if provided.
 */
export async function checkQuizPresence(input: PresenceCheckInput): Promise<PresenceCheckResult> {
  const {
    orgId,
    profileId,
    userRef: explicitUserRef,
    receiverId,
    windowMinutes = 10,
    startTime,
    endTime,
  } = input;

  let userRef = explicitUserRef;
  if (!userRef && profileId) {
    const profile = await prisma.userProfile.findUnique({ where: { id: profileId } });
    userRef = profile?.userId ?? null;
  }
  if (!userRef) {
    return { ok: false, reason: "Presence required: missing user reference" };
  }

  const now = new Date();
  const sinceBase = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const since = startTime ? new Date(Math.max(startTime.getTime(), sinceBase.getTime())) : sinceBase;
  const until = endTime ?? now;

  const where: any = {
    orgId,
    userRef,
    serverTimestamp: { gte: since, lte: until },
  };
  if (receiverId) where.receiverId = receiverId;

  const presence = await prisma.presenceEvent.findFirst({
    where,
    orderBy: { serverTimestamp: "desc" },
  });

  if (!presence) {
    return { ok: false, reason: "Presence validation failed" };
  }
  return { ok: true };
}
