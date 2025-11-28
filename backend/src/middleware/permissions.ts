import { NextFunction, Request, Response } from "express";
import { OrgRole } from "../types/auth";

type LegacyRole = "superadmin" | "admin" | "shift_manager" | "auditor" | "read-only";

const LEGACY_WEIGHT: Record<LegacyRole, number> = {
  "read-only": 0,
  auditor: 1,
  shift_manager: 2,
  admin: 3,
  superadmin: 4,
};

const ORG_WEIGHT: Record<OrgRole, number> = {
  viewer: 0,
  hr: 1,
  security: 2,
  admin: 3,
  owner: 4,
};

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
  return (req: Request, res: Response, next: NextFunction) => {
    // use req.user from requireAuth
    if (req.user && Array.isArray(req.user.roles)) {
      const userWeight = Math.max(...req.user.roles.map((r) => ORG_WEIGHT[r as OrgRole] ?? 0), 0);
      const minRequired = Math.min(...arr.map((r) => (ORG_WEIGHT[r as OrgRole] ?? LEGACY_WEIGHT[r as LegacyRole] ?? 0)));
      if (userWeight >= minRequired) return next();
    }

    // Fallback to legacy scope check
    const legacy = normalizeRole((req as any).apiKeyScope);
    const legacyWeight = LEGACY_WEIGHT[legacy] ?? 0;
    const minRequiredLegacy = Math.min(...arr.map((r) => LEGACY_WEIGHT[r as LegacyRole] ?? ORG_WEIGHT[r as OrgRole] ?? 0));
    if (legacyWeight >= minRequiredLegacy) return next();

    return res.status(403).json({ error: "Forbidden" });
  };
}

export { normalizeRole };
