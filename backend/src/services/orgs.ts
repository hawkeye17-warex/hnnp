import crypto from "crypto";
import { Prisma, Org, ApiKey } from "@prisma/client";
import { prisma } from "../db/prisma";

export type CreateOrgParams = {
  name: string;
  slug: string;
};

export type CreateApiKeyParams = {
  orgId: string;
  prefix: string;
  keyHash: string;
  name?: string;
  scopes?: string;
};

export async function createOrg(params: CreateOrgParams): Promise<Org> {
  const { name, slug } = params;
  try {
    return await prisma.org.create({
      data: {
        id: crypto.randomUUID(),
        name,
        slug,
        status: "active",
      },
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const e = new Error("Org slug already exists");
      (e as any).code = "ORG_EXISTS";
      throw e;
    }
    const e = new Error("Failed to create org");
    (e as any).code = "ORG_CREATE_FAILED";
    throw e;
  }
}

export async function createApiKey(params: CreateApiKeyParams): Promise<ApiKey> {
  const { orgId, prefix, keyHash, name = "Admin key", scopes = "admin" } = params;
  try {
    return await prisma.apiKey.create({
      data: {
        orgId,
        name,
        keyPrefix: prefix,
        keyHash,
        scopes,
      },
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const e = new Error("Key prefix already exists");
      (e as any).code = "API_KEY_EXISTS";
      throw e;
    }
    const e = new Error("Failed to create API key");
    (e as any).code = "API_KEY_CREATE_FAILED";
    throw e;
  }
}
