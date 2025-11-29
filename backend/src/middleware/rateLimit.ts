import { NextFunction, Request, Response } from "express";

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = Number.isFinite(Number(process.env.RATE_LIMIT_PER_MINUTE))
  ? Number(process.env.RATE_LIMIT_PER_MINUTE)
  : 100;

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const orgId = (req.org?.id ?? req.headers["x-org-id"] ?? "none") as string;
  const key = `${ip}:${orgId}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // drop old timestamps
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts <= WINDOW_MS);

  if (bucket.timestamps.length >= DEFAULT_LIMIT) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many requests" });
  }

  bucket.timestamps.push(now);
  return next();
}
