import { Router, Request, Response } from "express";
import { getSupabaseServiceClient } from "../services/supabaseClient";
import { logger } from "../services/logger";
import { logAudit } from "../services/audit";

type LogBody = {
  user_id?: string;
  email?: string;
  event?: string;
  success?: boolean;
  user_agent?: string;
};

const router = Router();

const extractIp = (req: Request): string | null => {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") {
    return fwd.split(",")[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0];
  }
  return req.ip || null;
};

router.post("/admin/auth/log", async (req: Request, res: Response) => {
  const body = (req.body || {}) as LogBody;
  const { user_id, email, event, success, user_agent } = body;

  if (!event || typeof success !== "boolean") {
    return res.status(400).json({ error: "event and success are required" });
  }

  try {
    const supabase = getSupabaseServiceClient();
    const ip = extractIp(req);
    const insertPayload = {
      user_id: user_id || null,
      email: email || null,
      event,
      success,
      ip,
      user_agent: user_agent || req.get("user-agent") || null,
    };

    const { error } = await supabase.from("auth_logs").insert(insertPayload);
    if (error) {
      logger.warn("auth log insert failed", { message: error.message });
      return res.status(202).json({ ok: false, error: "log insert failed" });
    }
    await logAudit({
      action: "admin_login",
      entityType: "auth",
      entityId: user_id ?? email ?? undefined,
      orgId: null,
      actorKey: null,
      actorRole: null,
      details: { email, event, success, ip },
    });
    return res.status(201).json({ ok: true });
  } catch (err: any) {
    logger.warn("auth log route error", { message: err?.message });
    return res.status(202).json({ ok: false, error: "log insert exception" });
  }
});

export { router as adminAuthLogRouter };
