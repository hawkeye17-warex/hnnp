import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/permissions";
import { requireAuth } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/orgScope";

const router = Router();

router.use(requireAuth, requireOrgAccess, requireRole("auditor"));

router.get("/internal/audit-logs", async (req: Request, res: Response) => {
  const { org_id, action, entity_type, limit } = req.query;

  let take = 100;
  if (typeof limit === "string") {
    const parsed = Number.parseInt(limit, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) {
      take = parsed;
    }
  }

  const where: any = {};
  if (typeof org_id === "string" && org_id.length > 0) {
    where.orgId = org_id;
  }
  if (typeof action === "string" && action.length > 0) {
    where.action = action;
  }
  if (typeof entity_type === "string" && entity_type.length > 0) {
    where.entityType = entity_type;
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
    return res.json(
      logs.map((l) => ({
        id: l.id,
        org_id: l.orgId,
        actor_key: l.actorKey,
        actor_role: l.actorRole,
        action: l.action,
        entity_type: l.entityType,
        entity_id: l.entityId,
        details: l.details,
        created_at: l.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing audit logs", err);
    // If the table is missing (e.g., migration not applied), return empty list instead of blocking UI
    // Prisma error code P2021 = table or column not found.
    if ((err as any)?.code === "P2021") {
      return res.json({ data: [], warning: "AuditLog table missing; apply latest migration." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as auditLogsRouter };
