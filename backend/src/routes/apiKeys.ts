import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { requireAuth, requireOrgAccess } from "../middleware/auth";
import { requireRole } from "../middleware/permissions";
import { computeApiKeyHash } from "../security/apiKeys";
import { buildAuditContext, logAudit } from "../services/audit";

const router = Router();
const API_KEY_SECRET = process.env.API_KEY_SECRET || "hnnp_api_key_secret";

function generateRawKey() {
  const randomPart = crypto.randomBytes(10).toString("hex");
  const suffix = crypto.randomBytes(16).toString("hex");
  const rawKey = `hnnp_live_${randomPart}${suffix}`;
  const keyPrefix = `hnnp_live_${randomPart.slice(0, 10)}`;
  return { rawKey, keyPrefix };
}

router.use(requireAuth, requireOrgAccess);

router.get("/api/org/api-keys", requireRole(["admin", "owner"]), async (req: Request, res: Response) => {
  const orgId = req.org?.id ?? req.orgId;
  if (!orgId) return res.status(400).json({ error: "Missing org context" });
  try {
    const keys = await prisma.apiKey.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.keyPrefix,
        masked: `${k.keyPrefix}…`,
        scopes: k.scopes,
        created_at: k.createdAt,
        last_used_at: k.lastUsedAt,
        revoked_at: k.revokedAt,
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing api keys", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/org/api-keys", requireRole(["admin", "owner"]), async (req: Request, res: Response) => {
  const orgId = req.org?.id ?? req.orgId;
  if (!orgId) return res.status(400).json({ error: "Missing org context" });
  const { name, scopes } = req.body ?? {};
  if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required" });
  const scopesStr =
    typeof scopes === "string"
      ? scopes
      : Array.isArray(scopes) && scopes.every((s) => typeof s === "string")
        ? (scopes as string[]).join(",")
        : "admin";

  try {
    const { rawKey, keyPrefix } = generateRawKey();
    const keyHash = computeApiKeyHash(rawKey, API_KEY_SECRET);
    const created = await prisma.apiKey.create({
      data: {
        orgId,
        name: name.trim(),
        keyPrefix,
        keyHash,
        scopes: scopesStr,
      },
    });

    await logAudit({
      action: "api_key_create",
      entityType: "api_key",
      entityId: created.id,
      details: { name, scopes: scopesStr },
      ...buildAuditContext(req),
    });

    return res.status(201).json({
      id: created.id,
      name: created.name,
      key_prefix: created.keyPrefix,
      masked: `${created.keyPrefix}…`,
      scopes: created.scopes,
      created_at: created.createdAt,
      last_used_at: created.lastUsedAt,
      revoked_at: created.revokedAt,
      raw_key: rawKey, // show once
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating api key", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/org/api-keys/:id", requireRole(["admin", "owner"]), async (req: Request, res: Response) => {
  const orgId = req.org?.id ?? req.orgId;
  if (!orgId) return res.status(400).json({ error: "Missing org context" });
  const { id } = req.params;
  try {
    const key = await prisma.apiKey.findFirst({ where: { id, orgId } });
    if (!key) return res.status(404).json({ error: "Key not found" });
    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      action: "api_key_revoke",
      entityType: "api_key",
      entityId: id,
      details: { name: key.name, scopes: key.scopes },
      ...buildAuditContext(req),
    });

    return res.status(204).send();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error revoking api key", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as apiKeysRouter };
