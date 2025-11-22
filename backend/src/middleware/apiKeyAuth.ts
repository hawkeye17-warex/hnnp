import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { computeApiKeyHash } from "../security/apiKeys";
import type { ApiKey, Org } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    org?: Org;
    apiKey?: ApiKey;
  }
}

function extractRawKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  const headerKey = req.headers["x-hnnp-api-key"];

  if (typeof headerKey === "string" && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.substring("Bearer ".length).trim();
    if (candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}

function derivePrefix(rawKey: string): string | null {
  const parts = rawKey.split("_");
  if (parts.length < 3) {
    return null;
  }
  const [prefix, env, rest] = parts;
  if (!prefix || !env || !rest) {
    return null;
  }
  const randomPartPrefix = rest.slice(0, 10); // matches generator prefix length
  return `${prefix}_${env}_${randomPartPrefix}`;
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // Allow CORS preflight to pass through without auth
  if (req.method === "OPTIONS") {
    return next();
  }

  const rawKey = extractRawKey(req);
  if (!rawKey) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const prefix = derivePrefix(rawKey);
  if (!prefix) {
    return res.status(401).json({ error: "Invalid API key format" });
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({ where: { keyPrefix: prefix } });
    if (!apiKey || apiKey.revokedAt) {
      return res.status(401).json({ error: "Invalid or revoked API key" });
    }

    const serverSecret = process.env.API_KEY_SECRET || "hnnp_api_key_secret";
    const incomingHash = computeApiKeyHash(rawKey, serverSecret);

    const hashesMatch =
      apiKey.keyHash.length === incomingHash.length &&
      crypto.timingSafeEqual(Buffer.from(apiKey.keyHash, "utf8"), Buffer.from(incomingHash, "utf8"));

    if (!hashesMatch) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const org = await prisma.org.findUnique({ where: { id: apiKey.orgId } });
    if (!org) {
      return res.status(401).json({ error: "Org not found for API key" });
    }

    req.apiKey = apiKey;
    req.org = org;

    // eslint-disable-next-line no-console
    console.log(`[api-key] org=${org.id} keyPrefix=${apiKey.keyPrefix}`);

    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("API key auth error", err);
    return res.status(401).json({ error: "Invalid API key" });
  }
}
