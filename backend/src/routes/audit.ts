import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/orgScope";

export async function recordAuditEvent(params: {
  orgId: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { orgId, userId, action, entityType, entityId, metadata } = params;
  await prisma.auditEvent.create({
    data: {
      orgId,
      userId: userId ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.get("/api/org/audit", async (req: Request, res: Response) => {
  const limitRaw = typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : 100;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? limitRaw : 100;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const action = typeof req.query.action === "string" ? req.query.action : undefined;
  const userId = typeof req.query.user_id === "string" ? req.query.user_id : undefined;

  if (!req.user?.orgId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const where: any = { orgId: req.user.orgId };
  if (action) where.action = action;
  if (userId) where.userId = userId;

  try {
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const nextCursor = events.length === limit ? events[events.length - 1].id : null;
    return res.json({
      items: events.map((e) => ({
        id: e.id,
        org_id: e.orgId,
        user_id: e.userId,
        action: e.action,
        entity_type: e.entityType,
        entity_id: e.entityId,
        metadata: e.metadata,
        created_at: e.createdAt.toISOString(),
      })),
      next_cursor: nextCursor,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching audit events", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as auditRouter };
