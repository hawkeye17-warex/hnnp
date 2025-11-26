import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { requireRole } from "../middleware/permissions";
import crypto from "crypto";
import { computeApiKeyHash } from "../security/apiKeys";

const router = Router();

const ORG_TYPES = ["school", "factory", "office", "hospital", "gov", "other"];
const MODULES = [
  "attendance",
  "quizzes",
  "exams",
  "sessions",
  "shifts",
  "workzones",
  "safety",
  "access_control",
  "analytics",
  "hps_insights",
  "developer_api",
];

router.use(apiKeyAuth, requireRole("superadmin"));

router.get("/api/control-plane/orgs", async (req: Request, res: Response) => {
  const limitParam = req.query.limit;
  const offsetParam = req.query.offset;
  let take = 50;
  let skip = 0;
  if (typeof limitParam === "string") {
    const parsed = Number.parseInt(limitParam, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) take = parsed;
  }
  if (typeof offsetParam === "string") {
    const parsed = Number.parseInt(offsetParam, 10);
    if (Number.isFinite(parsed) && parsed >= 0) skip = parsed;
  }

  try {
    const [items, total] = await Promise.all([
      prisma.org.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          orgType: true,
          enabledModules: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.org.count(),
    ]);
    return res.json({
      total,
      limit: take,
      offset: skip,
      data: items.map((o) => ({
        org_id: o.id,
        org_name: o.name,
        org_type: o.orgType ?? "office",
        enabled_modules: o.enabledModules ?? [],
        status: o.status,
        created_at: o.createdAt.toISOString(),
        updated_at: o.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing orgs", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/control-plane/orgs/:org_id", async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    return res.json({
      org_id: org.id,
      org_name: org.name,
      org_type: org.orgType ?? "office",
      enabled_modules: org.enabledModules ?? [],
      status: org.status,
      created_at: org.createdAt.toISOString(),
      updated_at: org.updatedAt.toISOString(),
      slug: org.slug,
      config: org.config,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching org", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/control-plane/orgs/:org_id", async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { org_type, enabled_modules } = req.body ?? {};

  const data: any = {};
  if (typeof org_type === "string" && ORG_TYPES.includes(org_type)) data.orgType = org_type;
  if (Array.isArray(enabled_modules) && enabled_modules.every((m) => typeof m === "string" && MODULES.includes(m))) {
    data.enabledModules = enabled_modules;
  }

  try {
    const updated = await prisma.org.update({
      where: { id: org_id },
      data,
    });
    return res.json({
      org_id: updated.id,
      org_name: updated.name,
      org_type: updated.orgType ?? "office",
      enabled_modules: updated.enabledModules ?? [],
      status: updated.status,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
      slug: updated.slug,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error updating org", err);
    if (err?.code === "P2025") return res.status(404).json({ error: "Org not found" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/control-plane/orgs", async (req: Request, res: Response) => {
  const { org_name, org_type, enabled_modules, slug } = req.body ?? {};
  if (typeof org_name !== "string" || org_name.trim().length === 0) {
    return res.status(400).json({ error: "org_name is required" });
  }

  const orgType = typeof org_type === "string" && ORG_TYPES.includes(org_type) ? org_type : "office";
  const enabledModules =
    Array.isArray(enabled_modules) && enabled_modules.every((m) => typeof m === "string" && MODULES.includes(m))
      ? enabled_modules
      : [];

  const orgId = crypto.randomUUID();
  const cleanSlug =
    typeof slug === "string" && slug.trim().length > 0
      ? slug.trim().toLowerCase()
      : `${org_name.trim().toLowerCase().replace(/\\s+/g, "-")}-${Math.random().toString(16).slice(2, 6)}`;

  try {
    const created = await prisma.org.create({
      data: {
        id: orgId,
        name: org_name.trim(),
        slug: cleanSlug,
        status: "active",
        orgType,
        enabledModules,
      },
    });

    // Seed a basic admin key
    const prefix = `hnnp_live_${crypto.randomBytes(5).toString("hex")}`;
    const rawKey = `${prefix}${crypto.randomBytes(16).toString("hex")}`;
    const keyPrefix = `hnnp_live_${rawKey.split("_")[2]?.slice(0, 10) ?? ""}`;
    const keyHash = computeApiKeyHash(rawKey, process.env.API_KEY_SECRET || "hnnp_api_key_secret");
    await prisma.apiKey.create({
      data: {
        orgId: orgId,
        name: "Admin key",
        keyPrefix,
        keyHash,
        scopes: "admin",
      },
    });

    return res.status(201).json({
      org_id: created.id,
      org_name: created.name,
      org_type: created.orgType ?? "office",
      enabled_modules: created.enabledModules ?? [],
      status: created.status,
      slug: created.slug,
      api_key: rawKey,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error creating org", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "Slug already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as controlPlaneRouter };
