import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, requireOrgAccess } from "../middleware/auth";
import { requireRole } from "../middleware/permissions";
import { buildAuditContext, logAudit } from "../services/audit";

const router = Router();

const defaults = {
  minScore: 0.7,
  allowFallbackGesture: true,
  requireHpsForAttendance: false,
  requireHpsForAccess: false,
};

function normalizePolicy(raw: any) {
  return {
    minScore: typeof raw?.minScore === "number" ? raw.minScore : defaults.minScore,
    allowFallbackGesture:
      typeof raw?.allowFallbackGesture === "boolean" ? raw.allowFallbackGesture : defaults.allowFallbackGesture,
    requireHpsForAttendance:
      typeof raw?.requireHpsForAttendance === "boolean" ? raw.requireHpsForAttendance : defaults.requireHpsForAttendance,
    requireHpsForAccess:
      typeof raw?.requireHpsForAccess === "boolean" ? raw.requireHpsForAccess : defaults.requireHpsForAccess,
  };
}

router.use(requireAuth);
router.use(requireOrgAccess);

router.get("/api/org/hps-policy", async (req: Request, res: Response) => {
  const orgId = req.org?.id ?? req.orgId ?? (req.headers["x-org-id"] as string | undefined);
  if (!orgId) return res.status(400).json({ error: "Missing org context" });

  try {
    const policy = await prisma.hpsPolicy.findUnique({ where: { orgId } });
    const data = normalizePolicy(policy);
    return res.json({ org_id: orgId, ...data, updated_at: policy?.updatedAt ?? null, updated_by: policy?.updatedBy ?? null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching HPS policy", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/api/org/hps-policy",
  requireRole(["security", "owner"]),
  async (req: Request, res: Response) => {
    const orgId = req.org?.id ?? req.orgId ?? (req.headers["x-org-id"] as string | undefined);
    if (!orgId) return res.status(400).json({ error: "Missing org context" });

    const body = req.body ?? {};
    const current = await prisma.hpsPolicy.findUnique({ where: { orgId } });
    const policy = normalizePolicy({ ...current, ...body });
    const updatedBy = req.apiKey?.keyPrefix ?? req.user?.id ?? "unknown";

    try {
      const saved = await prisma.hpsPolicy.upsert({
        where: { orgId },
        create: {
          orgId,
          minScore: policy.minScore,
          allowFallbackGesture: policy.allowFallbackGesture,
          requireHpsForAttendance: policy.requireHpsForAttendance,
          requireHpsForAccess: policy.requireHpsForAccess,
          updatedBy,
        },
        update: {
          minScore: policy.minScore,
          allowFallbackGesture: policy.allowFallbackGesture,
          requireHpsForAttendance: policy.requireHpsForAttendance,
          requireHpsForAccess: policy.requireHpsForAccess,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      await logAudit({
        action: "hps_policy_update",
        entityType: "hps_policy",
        entityId: saved.orgId,
        details: policy,
        ...buildAuditContext(req),
      });

      return res.json({
        org_id: orgId,
        ...policy,
        updated_at: saved.updatedAt,
        updated_by: saved.updatedBy,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error updating HPS policy", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export { router as hpsConfigRouter };
