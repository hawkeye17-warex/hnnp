import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/permissions";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/internal/search", requireAuth, requireRole("auditor"), async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    return res.status(400).json({ error: "q is required" });
  }

  const term = q.toLowerCase();

  try {
    const [orgs, receivers, users, logs] = await Promise.all([
      prisma.org.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, slug: true, status: true },
        take: 10,
      }),
      prisma.receiver.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { displayName: { contains: q, mode: "insensitive" } },
            { locationLabel: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, orgId: true, displayName: true, status: true, lastSeenAt: true },
        take: 10,
      }),
      prisma.adminUser.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { id: { contains: q } },
          ],
        },
        select: { id: true, email: true, name: true, role: true, status: true },
        take: 10,
      }),
      prisma.presenceEvent.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { receiverId: { contains: q } },
            { orgId: { contains: q } },
            { tokenPrefix: { contains: q } },
            { authResult: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          orgId: true,
          receiverId: true,
          tokenPrefix: true,
          authResult: true,
          serverTimestamp: true,
        },
        orderBy: { serverTimestamp: "desc" },
        take: 10,
      }),
    ]);

    return res.json({
      query: q,
      orgs,
      receivers,
      users,
      logs: logs.map((l) => ({
        ...l,
        serverTimestamp: l.serverTimestamp.toISOString(),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Global search error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as searchRouter };
