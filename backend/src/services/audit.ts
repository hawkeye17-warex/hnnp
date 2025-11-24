import { prisma } from "../db/prisma";
import type { Request } from "express";

type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  orgId?: string | null;
  details?: Record<string, unknown> | null;
  actorKey?: string | null;
  actorRole?: string | null;
};

export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        orgId: input.orgId ?? null,
        details: input.details ?? {},
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
