import { prisma } from "../src/db/prisma";
import crypto from "crypto";

async function main() {
  // Example orgs
  const orgSeeds = [
    {
      id: "de43ed7c-b43a-4644-8eed-28591792cc23",
      name: "NearID Demo Org",
      slug: "nearid-demo",
      orgType: "office",
      enabledModules: ["attendance", "analytics", "hps_insights", "developer_api"],
    },
    {
      id: "org-uofm-demo",
      name: "U of M",
      slug: "uofm",
      orgType: "school",
      enabledModules: ["attendance", "sessions", "quizzes", "exams", "analytics", "hps_insights"],
    },
    {
      id: "org-acme-demo",
      name: "Acme Manufacturing",
      slug: "acme-mfg",
      orgType: "factory",
      enabledModules: ["attendance", "shifts", "workzones", "safety", "access_control", "analytics", "hps_insights"],
    },
  ];

  const org = await prisma.org.upsert({
    where: { id: orgSeeds[0].id },
    update: {},
    create: {
      id: orgSeeds[0].id,
      name: orgSeeds[0].name,
      slug: orgSeeds[0].slug,
      status: "active",
      orgType: orgSeeds[0].orgType,
      enabledModules: orgSeeds[0].enabledModules,
    },
  });

  // Upsert additional example orgs without demo data
  for (const seed of orgSeeds.slice(1)) {
    await prisma.org.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        name: seed.name,
        slug: seed.slug,
        status: "active",
        orgType: seed.orgType,
        enabledModules: seed.enabledModules,
      },
    });
  }

  const receivers = await Promise.all(
    [
      { id: "R-DEMO-1", name: "HQ Entrance", location: "Toronto HQ" },
      { id: "R-DEMO-2", name: "Warehouse Gate", location: "Mississauga" },
      { id: "R-DEMO-3", name: "Floor 5 East", location: "Toronto HQ" },
    ].map((r) =>
      prisma.receiver.upsert({
        where: { id: r.id },
        update: { displayName: r.name, locationLabel: r.location, orgId: org.id, status: "active" },
        create: {
          id: r.id,
          orgId: org.id,
          displayName: r.name,
          locationLabel: r.location,
          authMode: "none_low_trust",
          status: "active",
        },
      }),
    ),
  );

  const profiles = await Promise.all(
    [
      { email: "alice@example.com", type: "worker" },
      { email: "bob@example.com", type: "worker" },
      { email: "carol@example.com", type: "worker" },
      { email: "dave@example.com", type: "worker" },
      { email: "eve@example.com", type: "auditor" },
      { email: "frank@example.com", type: "student" },
    ].map((p, idx) =>
      prisma.userProfile.upsert({
        where: { id: `profile-demo-${idx + 1}` },
        update: { capabilities: ["attendance", "shift", "breaks", "quiz"] },
        create: {
          id: `profile-demo-${idx + 1}`,
          orgId: org.id,
          userId: p.email,
          type: p.type,
          capabilities: ["attendance", "shift", "breaks", "quiz"],
        },
      }),
    ),
  );

  // Seed a current shift for Alice with an active break for Bob
  const now = new Date();
  const startShift = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  const aliceShift = await prisma.shift.upsert({
    where: { id: "shift-demo-alice" },
    update: { endTime: null, status: "open" },
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

  const carolShiftStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  await prisma.shift.upsert({
    where: { id: "shift-demo-carol" },
    update: {},
    create: {
      id: "shift-demo-carol",
      orgId: org.id,
      profileId: profiles[2].id,
      startTime: carolShiftStart,
      endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      totalSeconds: 4 * 60 * 60,
      status: "closed",
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

  await prisma.break.upsert({
    where: { id: "break-demo-carol-1" },
    update: {},
    create: {
      id: "break-demo-carol-1",
      shiftId: "shift-demo-carol",
      startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
      totalSeconds: 30 * 60,
      type: "unpaid",
    },
  });

  // Seed presence events for both workers
  const makePresence = async (profile: string, minutesAgo: number, receiverId: string) => {
    const ts = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const token = crypto.randomBytes(8).toString("hex");
    await prisma.presenceEvent.upsert({
      where: { id: `presence-${profile}-${minutesAgo}` },
      update: {},
      create: {
        id: `presence-${profile}-${minutesAgo}`,
        orgId: org.id,
        receiverId,
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

  await makePresence(profiles[0].userId, 15, receivers[0].id);
  await makePresence(profiles[1].userId, 5, receivers[1].id);
  await makePresence(profiles[2].userId, 30, receivers[2].id);
  await makePresence(profiles[3].userId, 90, receivers[0].id);

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

  // Quiz live with submissions
  const quizLive = await prisma.quizSession.upsert({
    where: { id: "quiz-demo-2" },
    update: {},
    create: {
      id: "quiz-demo-2",
      orgId: org.id,
      title: "Onboarding Check",
      startTime: new Date(now.getTime() - 15 * 60 * 1000),
      endTime: new Date(now.getTime() + 30 * 60 * 1000),
      status: "running",
      createdBy: "seed_script",
      settingsJson: { require_presence: true, presence_window_minutes: 20 },
    },
  });

  await prisma.quizSubmission.upsert({
    where: { id: "quiz-sub-demo-1" },
    update: {},
    create: {
      id: "quiz-sub-demo-1",
      quizId: quizLive.id,
      profileId: profiles[0].id,
      submittedAt: new Date(now.getTime() - 5 * 60 * 1000),
      answersJson: { q1: "A", q2: "True" },
      score: 85,
      status: "submitted",
    },
  });

  await prisma.quizSubmission.upsert({
    where: { id: "quiz-sub-demo-2" },
    update: {},
    create: {
      id: "quiz-sub-demo-2",
      quizId: quizLive.id,
      profileId: profiles[1].id,
      submittedAt: new Date(now.getTime() - 2 * 60 * 1000),
      answersJson: { q1: "B", q2: "False" },
      score: 65,
      status: "submitted",
    },
  });

  // Admin users
  await prisma.adminUser.upsert({
    where: { email: "admin1@nearid-demo.com" },
    update: {},
    create: {
      email: "admin1@nearid-demo.com",
      name: "Demo Admin 1",
      role: "admin",
      status: "active",
    },
  });
  await prisma.adminUser.upsert({
    where: { email: "manager@nearid-demo.com" },
    update: {},
    create: {
      email: "manager@nearid-demo.com",
      name: "Shift Manager",
      role: "shift_manager",
      status: "active",
    },
  });

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        orgId: org.id,
        actorKey: "seed_script",
        actorRole: "admin",
        action: "shift_adjust",
        entityType: "shift",
        entityId: aliceShift.id,
        details: { reason: "Seed data" },
      },
      {
        orgId: org.id,
        actorKey: "seed_script",
        actorRole: "admin",
        action: "quiz_create",
        entityType: "quiz",
        entityId: quizLive.id,
      },
    ],
    skipDuplicates: true,
  });

  // API key reminder (hashing done elsewhere)
  console.log(
    "Seed complete. Use an admin/shift_manager key for org:",
    org.id,
    "Existing keys remain unchanged (generate via backend /v2/orgs/:id/keys).",
  );

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
