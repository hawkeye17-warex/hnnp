import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { normalizeSettings } from "./orgs"; // reuse settings normalizer
import { requireRole } from "../middleware/permissions";

const router = Router();

router.use(apiKeyAuth);

const serializeShift = (s: any) => ({
  id: s.id,
  profile_id: s.profileId,
  org_id: s.orgId,
  location_id: s.locationId,
  start_time: s.startTime.toISOString(),
  end_time: s.endTime ? s.endTime.toISOString() : null,
  total_seconds: s.totalSeconds,
  status: s.status,
  created_at: s.createdAt.toISOString(),
});

const serializeBreak = (b: any) => ({
  id: b.id,
  shift_id: b.shiftId,
  start_time: b.startTime.toISOString(),
  end_time: b.endTime ? b.endTime.toISOString() : null,
  total_seconds: b.totalSeconds,
  type: b.type,
  created_at: b.createdAt.toISOString(),
});

async function getOrgSettings(orgId: string) {
  const org = await prisma.org.findUnique({ where: { id: orgId } });
  if (!org) return null;
  const cfg = (org.config ?? {}) as any;
  return { org, settings: normalizeSettings(cfg.systemSettings as any) };
}

router.post("/v2/shift/clock-in", requireRole("read-only"), async (req: Request, res: Response) => {
  const orgId = req.org?.id;
  const { profile_id, location_id } = req.body ?? {};
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  if (typeof profile_id !== "string" || profile_id.length === 0) {
    return res.status(400).json({ error: "profile_id is required" });
  }
  try {
    const settings = await getOrgSettings(orgId);
    if (!settings) return res.status(404).json({ error: "Org not found" });
    if (!settings.settings.allow_manual_clock_in_out) {
      return res.status(403).json({ error: "Manual clock-in is disabled by policy" });
    }

    const existing = await prisma.shift.findFirst({ where: { orgId, profileId: profile_id, endTime: null } });
    if (existing) {
      return res.status(400).json({ error: "Already on shift", shift: serializeShift(existing) });
    }

    const now = new Date();
    const shift = await prisma.shift.create({
      data: {
        orgId,
        profileId: profile_id,
        locationId: typeof location_id === "string" ? location_id : null,
        startTime: now,
        status: "open",
      },
    });

    return res.status(201).json({ shift: serializeShift(shift) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("clock-in error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/shift/clock-out", requireRole("read-only"), async (req: Request, res: Response) => {
  const orgId = req.org?.id;
  const { profile_id } = req.body ?? {};
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  if (typeof profile_id !== "string" || profile_id.length === 0) {
    return res.status(400).json({ error: "profile_id is required" });
  }
  try {
    const settings = await getOrgSettings(orgId);
    if (!settings) return res.status(404).json({ error: "Org not found" });
    if (!settings.settings.allow_manual_clock_in_out) {
      return res.status(403).json({ error: "Manual clock-out is disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { orgId, profileId: profile_id, endTime: null } });
    if (!shift) {
      return res.status(404).json({ error: "No active shift" });
    }
    const end = new Date();
    const totalSeconds = Math.max(0, Math.floor((end.getTime() - shift.startTime.getTime()) / 1000));
    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: { endTime: end, totalSeconds, status: "closed" },
    });
    return res.json({ shift: serializeShift(updated) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("clock-out error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/shift/start-break", requireRole("read-only"), async (req: Request, res: Response) => {
  const orgId = req.org?.id;
  const { profile_id, type } = req.body ?? {};
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  if (typeof profile_id !== "string" || profile_id.length === 0) {
    return res.status(400).json({ error: "profile_id is required" });
  }
  try {
    const settings = await getOrgSettings(orgId);
    if (!settings) return res.status(404).json({ error: "Org not found" });
    if (!settings.settings.allow_manual_break_edit) {
      return res.status(403).json({ error: "Manual breaks are disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { orgId, profileId: profile_id, endTime: null } });
    if (!shift) return res.status(404).json({ error: "No active shift" });

    const existing = await prisma.break.findFirst({ where: { shiftId: shift.id, endTime: null } });
    if (existing) {
      return res.status(400).json({ error: "Already on a break", break: serializeBreak(existing) });
    }

    const now = new Date();
    const brk = await prisma.break.create({
      data: {
        shiftId: shift.id,
        startTime: now,
        type: typeof type === "string" ? type : null,
      },
    });
    return res.status(201).json({ break: serializeBreak(brk), shift: serializeShift(shift) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("start-break error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/shift/end-break", requireRole("read-only"), async (req: Request, res: Response) => {
  const orgId = req.org?.id;
  const { profile_id } = req.body ?? {};
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  if (typeof profile_id !== "string" || profile_id.length === 0) {
    return res.status(400).json({ error: "profile_id is required" });
  }
  try {
    const settings = await getOrgSettings(orgId);
    if (!settings) return res.status(404).json({ error: "Org not found" });
    if (!settings.settings.allow_manual_break_edit) {
      return res.status(403).json({ error: "Manual breaks are disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { orgId, profileId: profile_id, endTime: null } });
    if (!shift) return res.status(404).json({ error: "No active shift" });

    const brk = await prisma.break.findFirst({ where: { shiftId: shift.id, endTime: null }, orderBy: { startTime: "desc" } });
    if (!brk) return res.status(404).json({ error: "No active break" });

    const end = new Date();
    const totalSeconds = Math.max(0, Math.floor((end.getTime() - brk.startTime.getTime()) / 1000));
    const updated = await prisma.break.update({
      where: { id: brk.id },
      data: { endTime: end, totalSeconds },
    });
    return res.json({ break: serializeBreak(updated), shift: serializeShift(shift) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("end-break error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/shift/current", requireRole("read-only"), async (req: Request, res: Response) => {
  const orgId = req.org?.id;
  const profileId = req.query.profile_id;
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  if (typeof profileId !== "string" || profileId.length === 0) {
    return res.status(400).json({ error: "profile_id is required" });
  }
  try {
    const shift = await prisma.shift.findFirst({
      where: { orgId, profileId, endTime: null },
      include: { breaks: { where: { endTime: null } } },
    });
    if (!shift) return res.json({ shift: null });
    return res.json({
      shift: serializeShift(shift),
      active_break: shift.breaks.length > 0 ? serializeBreak(shift.breaks[0]) : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("current shift error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/shift/history", requireRole("read-only"), async (req: Request, res: Response) => {
  const orgId = req.org?.id;
  const profileId = req.query.profile_id;
  if (!orgId) return res.status(404).json({ error: "Org not found" });
  if (typeof profileId !== "string" || profileId.length === 0) {
    return res.status(400).json({ error: "profile_id is required" });
  }
  try {
    const shifts = await prisma.shift.findMany({
      where: { orgId, profileId },
      include: { breaks: true },
      orderBy: { startTime: "desc" },
      take: 50,
    });
    return res.json({
      shifts: shifts.map((s) => ({
        ...serializeShift(s),
        breaks: s.breaks.map(serializeBreak),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("history shift error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as shiftRouter };
