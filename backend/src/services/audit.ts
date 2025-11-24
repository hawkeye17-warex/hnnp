import { prisma } from "../db/prisma";
import type { Request } from "express";
import { Prisma } from "@prisma/client";

type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  orgId?: string | null;
  details?: unknown;
  actorKey?: string | null;
  actorRole?: string | null;
};

function sanitizeDetails(val: unknown): Prisma.InputJsonValue | null {
  try {
    if (val === null || val === undefined) return null;
    return JSON.parse(JSON.stringify(val));
  } catch {
    return null;
  }
}

export async function logAudit(input: AuditInput) {
  try {
    const sanitized = sanitizeDetails(input.details);
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        orgId: input.orgId ?? null,
        details: sanitized === null ? undefined : sanitized,
        actorKey: input.actorKey ?? null,
        actorRole: input.actorRole ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("audit log failed", err);
  }
}

export function buildAuditContext(req: Request) {
  return {
    orgId: req.orgId ?? req.org?.id ?? null,
    actorKey: req.apiKey?.keyPrefix ?? null,
    actorRole: req.apiKeyScope ?? null,
  };
}
