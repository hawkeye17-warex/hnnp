import "dotenv/config";
import { prisma } from "../src/db/prisma";
import * as crypto from "crypto";
import argon2 from "argon2";

async function main() {
  const org = await prisma.org.upsert({
    where: { id: "test_org" },
    update: {},
    create: {
      id: "test_org",
      name: "Test Org",
      slug: "test-org",
      status: "active",
      config: {
        maxClockSkewMs: 120000,
        allowedVersions: [2],
      },
    },
  });

  async function upsertReceiver(id: string, devSecret: string) {
    const sharedSecretHash = await argon2.hash(devSecret);

    return prisma.receiver.upsert({
      where: { id },
      update: {},
      create: {
        id,
        orgId: org.id,
        displayName: `Receiver ${id}`,
        locationLabel: `Test Location ${id}`,
        authMode: "hmac_shared_secret",
        sharedSecretHash,
        status: "active",
      },
    });
  }

  const r1 = await upsertReceiver("R1", "dev-secret-R1");
  const r2 = await upsertReceiver("R2", "dev-secret-R2");

  const apiKeyRaw = crypto.randomBytes(32).toString("hex");
  const apiKeyPrefix = apiKeyRaw.slice(0, 8);
  const apiKeyHash = await argon2.hash(apiKeyRaw);

  const apiKey = await prisma.apiKey.upsert({
    where: { keyPrefix: apiKeyPrefix },
    update: {},
    create: {
      orgId: org.id,
      name: "Dev API key",
      keyPrefix: apiKeyPrefix,
      keyHash: apiKeyHash,
      scopes: "admin",
    },
  });

  console.log("Seeded test_org, receivers R1/R2, and API key:");
  console.log("org_id: test_org");
  console.log("receiver_ids: R1, R2");
  console.log("API key (store securely for dev use):", apiKeyRaw);
  console.log("API key prefix:", apiKey.keyPrefix);
  console.log("Receiver dev secrets:");
  console.log("R1: dev-secret-R1");
  console.log("R2: dev-secret-R2");
}

main()
  .catch((err) => {
    console.error("Error seeding dev DB:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

