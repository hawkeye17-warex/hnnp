import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  return res.json({
    status: "ok",
    version: process.env.VERSION ?? "unknown",
    environment: process.env.NODE_ENV ?? "unknown",
  });
});

router.get("/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ready" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Readiness check failed", err);
    return res.status(503).json({ status: "not_ready" });
  }
});

export { router as healthRouter };
