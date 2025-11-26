import request from "supertest";
import { app } from "../index";

jest.mock("../db/prisma", () => {
  return {
    prisma: {
      quizSession: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      presenceEvent: {
        findFirst: jest.fn(),
      },
      shift: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      break: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      org: {
        findUnique: jest.fn(),
      },
    },
  };
});

const { prisma } = jest.requireMock("../db/prisma");

describe("Quiz submit presence checks", () => {
  const apiKey = "testkey";
  const orgId = "org1";

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.org.findUnique.mockResolvedValue({ id: orgId, config: {} });
  });

  it("rejects missing presence when required", async () => {
    prisma.quizSession.findFirst.mockResolvedValue({
      id: "quiz1",
      orgId,
      startTime: new Date(Date.now() - 60_000),
      endTime: new Date(Date.now() + 60_000),
      settingsJson: { require_presence: true, presence_window_minutes: 10 },
      receiverId: null,
    });
    prisma.presenceEvent.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(`/v2/quiz/submit`)
      .set("x-hnnp-api-key", apiKey)
      .send({ quiz_id: "quiz1", user_ref: "user1" });

    expect(res.status).toBe(403);
  });
});

describe("Shift clock-in respects policy", () => {
  const apiKey = "testkey";
  const orgId = "org1";

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.org.findUnique.mockResolvedValue({
      id: orgId,
      config: { systemSettings: { allow_manual_clock_in_out: false, allow_manual_break_edit: true } },
    });
  });

  it("blocks clock-in when policy disabled", async () => {
    const res = await request(app)
      .post("/v2/shift/clock-in")
      .set("x-hnnp-api-key", apiKey)
      .send({ profile_id: "p1" });
    expect(res.status).toBe(403);
  });

  it("allows clock-in when enabled", async () => {
    prisma.org.findUnique.mockResolvedValue({
      id: orgId,
      config: { systemSettings: { allow_manual_clock_in_out: true, allow_manual_break_edit: true } },
    });
    prisma.shift.findFirst.mockResolvedValue(null);
    prisma.shift.create.mockResolvedValue({
      id: "s1",
      orgId,
      profileId: "p1",
      locationId: null,
      startTime: new Date(),
      endTime: null,
      totalSeconds: null,
      status: "open",
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/v2/shift/clock-in")
      .set("x-hnnp-api-key", apiKey)
      .send({ profile_id: "p1" });
    expect(res.status).toBe(201);
    expect(prisma.shift.create).toHaveBeenCalled();
  });
});
