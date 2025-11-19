import "dotenv/config";
import { prisma } from "../src/db/prisma";
import argon2 from "argon2";
import { createApiKeyForOrg } from "../src/security/apiKeys";

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

  await upsertReceiver("R1", "dev-secret-R1");
  await upsertReceiver("R2", "dev-secret-R2");

  // Remove any existing dev keys for this org to avoid duplicate prefixes.
  await prisma.apiKey.deleteMany({ where: { orgId: org.id } });

  const { rawKey, keyPrefix } = await createApiKeyForOrg({
    orgId: org.id,
    name: "Dev API key",
    scopes: ["admin:read", "admin:write"].join(","),
    env: "test",
  });

  console.log("Seeded test_org, receivers R1/R2, and API key:");
  console.log("org_id: test_org");
  console.log("receiver_ids: R1, R2");
  console.log("API key (store securely for dev use):", rawKey);
  console.log("API key prefix:", keyPrefix);
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
