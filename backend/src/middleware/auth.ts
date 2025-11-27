import { NextFunction, Request, Response } from "express";
import { apiKeyAuth } from "./apiKeyAuth";

type UserRole = "superadmin" | "admin" | "auditor" | "shift_manager" | "read-only";

export type AuthUser = {
  id: string;
  email: string | null;
  orgId: string;
  roles: UserRole[];
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

function roleFromScope(scope?: string | null): UserRole {
  const value = (scope ?? "").toLowerCase().trim();
  if (value.includes("superadmin")) return "superadmin";
  if (value.includes("shift_manager") || value.includes("shift-manager")) return "shift_manager";
  if (value.includes("auditor")) return "auditor";
  if (value.includes("read-only") || value.includes("readonly")) return "read-only";
  if (value.includes("admin")) return "admin";
  return "admin";
}

/**
 * requireAuth ensures a valid API credential is present and attaches a normalized user object.
 * It reuses the existing apiKeyAuth middleware so API keys continue to work,
 * while giving us a consistent req.user shape for downstream handlers.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") return next();

  return apiKeyAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (!req.org || !req.apiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = {
      id: req.apiKey.id,
      email: req.apiKey.name ?? null,
      orgId: req.org.id,
      roles: [roleFromScope(req.apiKeyScope)],
    };
    return next();
  });
}

/**
 * requireOrgAccess enforces that the caller is scoped to a specific org via X-Org-Id.
 * The org must match the authenticated user's org.
 */
export function requireOrgAccess(req: Request, res: Response, next: NextFunction) {
  const orgHeader = req.headers["x-org-id"];
  const headerOrgId = typeof orgHeader === "string" ? orgHeader.trim() : Array.isArray(orgHeader) ? orgHeader[0] : "";
  const paramOrgId = (req.params?.orgId as string) || (req.params?.id as string) || "";
  const effectiveOrgId = headerOrgId || paramOrgId || req.org?.id || req.user?.orgId || "";

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!effectiveOrgId) {
    return res.status(400).json({ error: "Org id is required" });
  }

  if (req.user.orgId !== effectiveOrgId) {
    return res.status(403).json({ error: "Org access denied" });
  }

  return next();
}

/**
 * optionalOrgAccess: if header/path not provided, fall back to user/org and allow.
 * If provided and mismatched, reject.
 */
export function optionalOrgAccess(req: Request, res: Response, next: NextFunction) {
  const orgHeader = req.headers["x-org-id"];
  const headerOrgId = typeof orgHeader === "string" ? orgHeader.trim() : Array.isArray(orgHeader) ? orgHeader[0] : "";
  const paramOrgId = (req.params?.orgId as string) || (req.params?.id as string) || "";
  const effectiveOrgId = headerOrgId || paramOrgId;

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!effectiveOrgId) {
    return next();
  }

  if (req.user.orgId !== effectiveOrgId) {
    return res.status(403).json({ error: "Org access denied" });
  }

  return next();
}
