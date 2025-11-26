import { NextFunction, Request, Response } from "express";

type Role = "superadmin" | "admin" | "shift_manager" | "auditor" | "read-only";

const ROLE_WEIGHT: Record<Role, number> = {
  "read-only": 0,
  auditor: 1,
  shift_manager: 2,
  admin: 3,
  superadmin: 4,
};

function normalizeRole(scope?: string | null): Role {
  const value = (scope ?? "").toLowerCase().trim();
  if (value.includes("shift_manager") || value.includes("shift-manager") || value.includes("shift manager")) return "shift_manager";
  if (value.includes("superadmin")) return "superadmin";
  if (value.includes("admin")) return "admin";
  if (value.includes("auditor")) return "auditor";
  if (value.includes("read-only") || value.includes("readonly")) return "read-only";
  // default to admin so that missing/unknown scopes still allow console read access
  return "admin";
}

export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = normalizeRole(req.apiKeyScope);
    const allowed = ROLE_WEIGHT[role] >= ROLE_WEIGHT[minRole];
    if (!allowed) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    return next();
  };
}

export { normalizeRole };
