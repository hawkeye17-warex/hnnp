import crypto from "crypto";
import { prisma } from "../db/prisma";

const API_KEY_PREFIX = "hnnp";
const API_KEY_ENV_SECRET = process.env.API_KEY_SECRET || "hnnp_api_key_secret";

export interface GeneratedApiKey {
  rawKey: string;
  prefix: string;
  hash: string;
}

export function computeApiKeyHash(rawKey: string, secret: string): string {
  return crypto.createHmac("sha256", Buffer.from(secret, "utf8")).update(rawKey, "utf8").digest("hex");
}

export function generateApiKey(env: "live" | "test" = "test"): GeneratedApiKey {
  const randomPart = crypto.randomBytes(24).toString("hex"); // 48 chars hex
  const rawKey = `${API_KEY_PREFIX}_${env}_${randomPart}`;
  const prefixLength = 10;
  const prefix = rawKey.slice(0, API_KEY_PREFIX.length + 1 + env.length + 1 + prefixLength); // include separators
  const hash = computeApiKeyHash(rawKey, API_KEY_ENV_SECRET);
  return { rawKey, prefix, hash };
}

export async function createApiKeyForOrg(params: {
  orgId: string;
  name: string;
  scopes: string;
  env?: "live" | "test";
}): Promise<{ rawKey: string; keyPrefix: string }> {
  const { orgId, name, scopes, env = "test" } = params;
  const generated = generateApiKey(env);

  await prisma.apiKey.create({
    data: {
      orgId,
      name,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
      scopes,
    },
  });

  return { rawKey: generated.rawKey, keyPrefix: generated.prefix };
}
