import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/orgScope";
import { requireRole } from "../middleware/permissions";
import { Prisma } from "@prisma/client";

const router = Router();

router.use(requireAuth, requireOrgAccess);

router.get("/api/org/loa-profile", requireRole(["admin", "owner", "auditor"]), async (req: Request, res: Response) => {
  if (!req.user?.orgId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const profiles = await prisma.loaProfile.findMany({ where: { orgId: req.user.orgId } });
    const assignments = await prisma.loaAssignment.findMany({ where: { orgId: req.user.orgId } });
    return res.json({
      profiles: profiles.map((p) => ({
        id: p.id,
        org_id: p.orgId,
        name: p.name,
        requirements: p.requirements as Prisma.JsonValue,
        created_at: p.createdAt.toISOString(),
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        org_id: a.orgId,
        use_case: a.useCase,
        loa_profile_id: a.loaProfileId,
        created_at: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching LoA profile", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/org/loa-profile", requireRole(["admin", "owner"]), async (req: Request, res: Response) => {
  if (!req.user?.orgId) return res.status(401).json({ error: "Unauthorized" });
  const { assignments } = (req.body ?? {}) as {
    assignments?: { use_case: string; loa_profile_id: string }[];
  };
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: "assignments must be an array" });
  }

  try {
    // Replace assignments for the org
    await prisma.$transaction([
      prisma.loaAssignment.deleteMany({ where: { orgId: req.user.orgId } }),
      prisma.loaAssignment.createMany({
        data: assignments.map((a) => ({
          orgId: req.user!.orgId,
          useCase: a.use_case,
          loaProfileId: a.loa_profile_id,
        })),
      }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error updating LoA assignments", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as loaRouter };
