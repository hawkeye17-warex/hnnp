import dotenv from "dotenv";
import request from "supertest";
import { prisma } from "../../db/prisma";
import { app } from "../../index";

dotenv.config({ path: ".env.test" });

const TEST_ORG_ID = "test_org_db";

describe("DB: org and receiver flows", () => {
  if (process.env.RUN_DB_TESTS !== "1") {
    it.skip("skipped because RUN_DB_TESTS is not set", () => {
      // Skipped in non-DB test runs.
    });
    return;
  }

  beforeAll(async () => {
    await prisma.presenceEvent.deleteMany({ where: { orgId: TEST_ORG_ID } });
    await prisma.receiver.deleteMany({ where: { orgId: TEST_ORG_ID } });
    await prisma.org.deleteMany({ where: { id: TEST_ORG_ID } });

    await prisma.org.create({
      data: {
        id: TEST_ORG_ID,
        name: "Test Org DB",
        slug: "test-org-db",
        status: "active",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates receiver via API and persists to DB", async () => {
    const receiverId = "R_db_1";
    const sharedSecret = "dev-secret-db-R1";

    const res = await request(app)
      .post(`/v2/orgs/${TEST_ORG_ID}/receivers`)
      .send({
        receiver_id: receiverId,
        display_name: "DB Receiver 1",
        location_label: "DB Location 1",
        auth_mode: "hmac_shared_secret",
        shared_secret: sharedSecret,
        status: "active",
      });

    expect(res.status).toBe(201);
    expect(res.body.receiver_id).toBe(receiverId);
    expect(res.body.display_name).toBe("DB Receiver 1");
    expect(res.body.auth_mode).toBe("hmac_shared_secret");
    expect(res.body).not.toHaveProperty("shared_secret");
    expect(res.body).not.toHaveProperty("sharedSecretHash");

    const stored = await prisma.receiver.findUnique({ where: { id: receiverId } });
    expect(stored).not.toBeNull();
    expect(stored?.orgId).toBe(TEST_ORG_ID);
    expect(stored?.sharedSecretHash).toBeTruthy();
    expect(stored?.sharedSecretHash).not.toBe(sharedSecret);
  });

  it("lists receivers for org via API", async () => {
    const res = await request(app).get(`/v2/orgs/${TEST_ORG_ID}/receivers`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const receiver = res.body.find((r: { receiver_id: string }) => r.receiver_id === "R_db_1");
    expect(receiver).toBeDefined();
    expect(receiver.org_id).toBe(TEST_ORG_ID);
    expect(receiver.display_name).toBe("DB Receiver 1");
  });
});

