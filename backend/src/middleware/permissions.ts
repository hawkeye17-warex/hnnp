import { NextFunction, Request, Response } from "express";
import { OrgRole } from "../types/auth";

type LegacyRole = "superadmin" | "admin" | "shift_manager" | "auditor" | "read-only";

function normalizeRole(scope?: string | null): LegacyRole {
  const value = (scope ?? "").toLowerCase().trim();
  if (value.includes("shift_manager") || value.includes("shift-manager") || value.includes("shift manager")) return "shift_manager";
  if (value.includes("superadmin")) return "superadmin";
  if (value.includes("admin")) return "admin";
  if (value.includes("auditor")) return "auditor";
  if (value.includes("read-only") || value.includes("readonly")) return "read-only";
  return "admin";
}

/**
 * requireRole enforces that the caller has at least one of the allowed org roles.
 * It checks req.user.roles (set by requireAuth) or falls back to legacy apiKeyScope normalization.
 */
type AllowedInput = OrgRole | LegacyRole | (OrgRole | LegacyRole)[];

export function requireRole(allowed: AllowedInput) {
  const arr = Array.isArray(allowed) ? allowed : [allowed];
  const allowedSet = new Set(arr);
  return (req: Request, res: Response, next: NextFunction) => {
    // use req.user from requireAuth
    if (req.user && Array.isArray(req.user.roles)) {
      const has = req.user.roles.some((r) => allowedSet.has(r as any));
      if (has) return next();
    }

    // Fallback to legacy scope check
    const legacy = normalizeRole((req as any).apiKeyScope);
    if (allowedSet.has(legacy as any)) return next();

    return res.status(403).json({ error: "Forbidden" });
  };
}

export { normalizeRole };
