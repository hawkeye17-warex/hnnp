import { prisma } from "../src/db/prisma";
import crypto from "crypto";

// Seed demo data for a single org to showcase UI
const ORG_ID = "de43ed7c-b43a-4644-8eed-28591792cc23";

async function main() {
  const existing = await prisma.org.findUnique({ where: { id: ORG_ID } });
  let org;
  if (existing) {
    org = existing;
  } else {
    const slug = "nearid-demo-" + Math.random().toString(16).slice(2, 6);
    org = await prisma.org.create({
      data: {
        id: ORG_ID,
        name: "NearID Demo Org",
        slug,
        status: "active",
      },
    });
  }

  const receiver = await prisma.receiver.upsert({
    where: { id: "R-DEMO-1" },
    update: { displayName: "Demo Door", locationLabel: "HQ Entrance", orgId: org.id },
    create: {
      id: "R-DEMO-1",
      orgId: org.id,
      displayName: "Demo Door",
      locationLabel: "HQ Entrance",
      authMode: "none_low_trust",
      status: "active",
    },
  });

  const profiles = await Promise.all(
    ["alice@example.com", "bob@example.com"].map((email, idx) =>
      prisma.userProfile.upsert({
        where: { id: `profile-demo-${idx + 1}` },
        update: { capabilities: ["attendance", "shift", "breaks"] },
        create: {
          id: `profile-demo-${idx + 1}`,
          orgId: org.id,
          userId: email,
          type: "worker",
          capabilities: ["attendance", "shift", "breaks"],
        },
      }),
    ),
  );

  // Seed a current shift for Alice with an active break for Bob
  const now = new Date();
  const startShift = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  const aliceShift = await prisma.shift.upsert({
    where: { id: "shift-demo-alice" },
    update: {},
    create: {
      id: "shift-demo-alice",
      orgId: org.id,
      profileId: profiles[0].id,
      startTime: startShift,
      status: "open",
    },
  });

  const bobShiftStart = new Date(now.getTime() - 90 * 60 * 1000);
  const bobShift = await prisma.shift.upsert({
    where: { id: "shift-demo-bob" },
    update: { endTime: null, status: "open" },
    create: {
      id: "shift-demo-bob",
      orgId: org.id,
      profileId: profiles[1].id,
      startTime: bobShiftStart,
      status: "open",
    },
  });

  await prisma.break.upsert({
    where: { id: "break-demo-bob" },
    update: {},
    create: {
      id: "break-demo-bob",
      shiftId: bobShift.id,
      startTime: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
      type: "paid",
    },
  });

  // Seed presence events for both workers
  const makePresence = async (profile: string, minutesAgo: number) => {
    const ts = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const token = crypto.randomBytes(8).toString("hex");
    await prisma.presenceEvent.upsert({
      where: { id: `presence-${profile}-${minutesAgo}` },
      update: {},
      create: {
        id: `presence-${profile}-${minutesAgo}`,
        orgId: org.id,
        receiverId: receiver.id,
        deviceIdHash: crypto.createHash("sha256").update(profile).digest("hex").slice(0, 16),
        userRef: profile,
        clientTimestampMs: BigInt(ts.getTime()),
        serverTimestamp: ts,
        timeSlot: 1,
        version: 2,
        flags: 0,
        tokenPrefix: token.slice(0, 8),
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        isAnonymous: false,
        authResult: "accepted",
        createdAt: ts,
      },
    });
  };

  await makePresence(profiles[0].userId, 15);
  await makePresence(profiles[1].userId, 5);

  // Seed a quiz in draft
  await prisma.quizSession.upsert({
    where: { id: "quiz-demo-1" },
    update: {},
    create: {
      id: "quiz-demo-1",
      orgId: org.id,
      title: "Safety Basics",
      startTime: new Date(now.getTime() + 30 * 60 * 1000),
      endTime: new Date(now.getTime() + 60 * 60 * 1000),
      status: "draft",
      createdBy: "seed_script",
      settingsJson: { require_presence: false },
    },
  });

  console.log("Seeded demo data for org", org.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
