import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { normalizeRole, requireRole } from "../middleware/permissions";
import type { Org, UserProfile } from "@prisma/client";

const router = Router();

function serializeOrg(org: Org) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    config: org.config,
    created_at: org.createdAt.toISOString(),
    updated_at: org.updatedAt.toISOString(),
  };
}

function serializeProfile(profile: UserProfile) {
  const capsRaw = profile.capabilities;
  let capabilities: string[] = [];
  if (Array.isArray(capsRaw)) {
    capabilities = capsRaw.map((c) => String(c));
  } else if (typeof capsRaw === "string") {
    capabilities = [capsRaw];
  }
  return {
    id: profile.id,
    user_id: profile.userId,
    org_id: profile.orgId,
    type: profile.type,
    capabilities,
    created_at: profile.createdAt.toISOString(),
  };
}

// Mobile "me" endpoint: keyed by API key (org-scoped) for now.
router.get("/v2/me", apiKeyAuth, requireRole("read-only"), async (req: Request, res: Response) => {
  try {
    const org = req.org;
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    // In absence of user identity, return org-level profiles for this org.
    const profiles = await prisma.userProfile.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({
      org: serializeOrg(org),
      profiles: profiles.map(serializeProfile),
      role: normalizeRole(req.apiKeyScope),
      scope: req.apiKeyScope ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error in /v2/me", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as meRouter };
