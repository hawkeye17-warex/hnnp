import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

router.use(apiKeyAuth);

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function getPagination(query: Record<string, unknown>): { page: number; limit: number } {
  const pageRaw = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const limitRaw = typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : 100;

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  let limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 100;
  if (limit > 1000) limit = 1000;

  return { page, limit };
}

router.get("/v1/presence/events", async (req: Request, res: Response) => {
  const orgId = req.query.orgId;
  if (typeof orgId !== "string" || orgId.length === 0) {
    return res.status(400).json({ error: "orgId is required" });
  }

  const userRef = typeof req.query.userRef === "string" ? req.query.userRef : undefined;
  const receiverId = typeof req.query.receiverId === "string" ? req.query.receiverId : undefined;
  const fromDate = parseDate(req.query.from);
  const toDate = parseDate(req.query.to);

  const { page, limit } = getPagination(req.query);

  try {
    const where: any = { orgId };
    if (userRef) where.userRef = userRef;
    if (receiverId) where.receiverId = receiverId;
    if (fromDate || toDate) {
      where.serverTimestamp = {};
      if (fromDate) where.serverTimestamp.gte = fromDate;
      if (toDate) where.serverTimestamp.lte = toDate;
    }

    const events = await prisma.presenceEvent.findMany({
      where,
      orderBy: { serverTimestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const nextPage = events.length === limit ? page + 1 : null;

    return res.status(200).json({
      status: "ok",
      page,
      nextPage,
      events: events.map((evt) => ({
        id: evt.id,
        receiver_id: evt.receiverId,
        user_ref: evt.userRef,
        device_id_hash: evt.deviceIdHash,
        client_timestamp_ms: Number(evt.clientTimestampMs),
        server_timestamp: evt.serverTimestamp.toISOString(),
        time_slot: evt.timeSlot,
        version: evt.version,
        flags: evt.flags,
        token_prefix: evt.tokenPrefix,
        auth_result: evt.authResult,
        is_anonymous: evt.isAnonymous,
        reason: evt.reason ?? null,
        meta: evt.meta ?? null,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching presence events", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v1/presence/sessions", async (req: Request, res: Response) => {
  const orgId = req.query.orgId;
  if (typeof orgId !== "string" || orgId.length === 0) {
    return res.status(400).json({ error: "orgId is required" });
  }

  const userRef = typeof req.query.userRef === "string" ? req.query.userRef : undefined;
  const receiverId = typeof req.query.receiverId === "string" ? req.query.receiverId : undefined;
  const deviceIdHash =
    typeof req.query.deviceIdHash === "string" ? req.query.deviceIdHash : undefined;
  const fromDate = parseDate(req.query.from);
  const toDate = parseDate(req.query.to);

  const { page, limit } = getPagination(req.query);

  try {
    const where: any = { orgId };
    if (userRef) where.userRef = userRef;
    if (receiverId) where.receiverId = receiverId;
    if (deviceIdHash) where.deviceIdHash = deviceIdHash;
    if (fromDate || toDate) {
      where.startedAt = {};
      if (fromDate) where.startedAt.gte = fromDate;
      if (toDate) where.startedAt.lte = toDate;
    }

    const sessions = await prisma.presenceSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const nextPage = sessions.length === limit ? page + 1 : null;

    return res.status(200).json({
      status: "ok",
      page,
      nextPage,
      sessions: sessions.map((s) => ({
        id: s.id,
        org_id: s.orgId,
        receiver_id: s.receiverId,
        user_ref: s.userRef,
        device_id_hash: s.deviceIdHash,
        started_at: s.startedAt.toISOString(),
        ended_at: s.endedAt ? s.endedAt.toISOString() : null,
        flags: s.flags,
        meta: s.meta ?? null,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching presence sessions", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as presenceReadRouter };

