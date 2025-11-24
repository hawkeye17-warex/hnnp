import { Router, Request, Response } from "express";
import argon2 from "argon2";
import crypto from "crypto";
import type { Org, Receiver } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { computeApiKeyHash } from "../security/apiKeys";
import { requireRole } from "../middleware/permissions";

const router = Router();

const API_KEY_SECRET = process.env.API_KEY_SECRET || "hnnp_api_key_secret";

// Protect all org/receiver admin routes with API key auth.
// NOTE: internal org creation endpoint is defined before auth middleware.

router.post("/internal/orgs/create", async (req: Request, res: Response) => {
  const { name, slug } = (req.body ?? {}) as { name?: unknown; slug?: unknown };

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "name is required" });
  }
  if (typeof slug !== "string" || slug.trim().length === 0) {
    return res.status(400).json({ error: "slug is required" });
  }

  try {
    const existing = await prisma.org.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "slug already exists" });
    }

    const orgId = crypto.randomUUID();
    const prefix = `hnnp_live_${crypto.randomBytes(5).toString("hex")}`;
    const rawKey = `${prefix}${crypto.randomBytes(16).toString("hex")}`;
    const keyPrefix = `hnnp_live_${rawKey.split("_")[2]?.slice(0, 10) ?? ""}`;
    const keyHash = computeApiKeyHash(rawKey, API_KEY_SECRET);

    await prisma.$transaction([
      prisma.org.create({
        data: {
          id: orgId,
          name: name.trim(),
          slug: slug.trim(),
          status: "active",
        },
      }),
      prisma.apiKey.create({
        data: {
          orgId,
          name: "Admin key",
          keyPrefix,
          keyHash,
          scopes: "admin",
        },
      }),
    ]);

    return res.status(201).json({ orgId, apiKey: rawKey });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating org", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.use(apiKeyAuth);

router.get("/internal/test-auth", requireRole("read-only"), async (req: Request, res: Response) => {
  if (!req.org) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id, name, slug } = req.org;
  return res.json({ ok: true, org: { id, name, slug }, scope: req.apiKeyScope ?? "unknown" });
});

function serializeOrg(org: Org) {
  return {
    org_id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    config: org.config,
    created_at: org.createdAt.toISOString(),
    updated_at: org.updatedAt.toISOString(),
  };
}

function serializeReceiver(receiver: Receiver) {
  return {
    receiver_id: receiver.id,
    org_id: receiver.orgId,
    display_name: receiver.displayName,
    location_label: receiver.locationLabel,
    latitude: receiver.latitude,
    longitude: receiver.longitude,
    auth_mode: receiver.authMode,
    firmware_version: receiver.firmwareVersion,
    status: receiver.status,
    last_seen_at: receiver.lastSeenAt ? receiver.lastSeenAt.toISOString() : null,
    created_at: receiver.createdAt.toISOString(),
    updated_at: receiver.updatedAt.toISOString(),
  };
}

router.get("/v2/orgs/:org_id", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });

    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    return res.status(200).json(serializeOrg(org));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching org", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs", requireRole("read-only"), async (req: Request, res: Response) => {
  const includeKeys = req.query.include_keys === "true";
  try {
    const orgs = await prisma.org.findMany({
      orderBy: { createdAt: "desc" },
      include: includeKeys ? { apiKeys: true } : undefined,
    });
    return res.status(200).json(
      orgs.map((org: any) => ({
        ...serializeOrg(org),
        key_prefixes: includeKeys && org.apiKeys ? org.apiKeys.map((k: any) => k.keyPrefix) : undefined,
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing orgs", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/receivers", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const receivers = await prisma.receiver.findMany({
      where: { orgId: org_id },
      orderBy: { id: "asc" },
    });

    return res.status(200).json(receivers.map(serializeReceiver));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing receivers", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/receivers", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const body = req.body ?? {};

  const {
    receiver_id,
    display_name,
    location_label,
    latitude,
    longitude,
    auth_mode,
    shared_secret,
    public_key_pem,
    firmware_version,
    status,
  } = body as {
    receiver_id?: unknown;
    display_name?: unknown;
    location_label?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    auth_mode?: unknown;
    shared_secret?: unknown;
    public_key_pem?: unknown;
    firmware_version?: unknown;
    status?: unknown;
  };

  if (typeof receiver_id !== "string" || receiver_id.length === 0) {
    return res.status(400).json({ error: "receiver_id is required" });
  }

  if (typeof auth_mode !== "string" || auth_mode.length === 0) {
    return res.status(400).json({ error: "auth_mode is required" });
  }

  const authMode = auth_mode;

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const existing = await prisma.receiver.findUnique({ where: { id: receiver_id } });
    if (existing) {
      return res.status(409).json({ error: "Receiver with this id already exists" });
    }

    let sharedSecretHash: string | undefined;
    let publicKeyPem: string | undefined;

    if (authMode === "hmac_shared_secret") {
      if (typeof shared_secret !== "string" || shared_secret.length === 0) {
        return res
          .status(400)
          .json({ error: "shared_secret is required when auth_mode is hmac_shared_secret" });
      }
      sharedSecretHash = await argon2.hash(shared_secret);
    } else if (authMode === "public_key") {
      if (typeof public_key_pem !== "string" || public_key_pem.length === 0) {
        return res
          .status(400)
          .json({ error: "public_key_pem is required when auth_mode is public_key" });
      }
      publicKeyPem = public_key_pem;
    }

    const receiver = await prisma.receiver.create({
      data: {
        id: receiver_id,
        orgId: org.id,
        displayName:
          typeof display_name === "string" && display_name.length > 0
            ? display_name
            : `Receiver ${receiver_id}`,
        locationLabel:
          typeof location_label === "string" && location_label.length > 0
            ? location_label
            : undefined,
        latitude:
          typeof latitude === "number"
            ? latitude
            : typeof latitude === "string" && latitude.length > 0
              ? Number(latitude)
              : undefined,
        longitude:
          typeof longitude === "number"
            ? longitude
            : typeof longitude === "string" && longitude.length > 0
              ? Number(longitude)
              : undefined,
        authMode,
        sharedSecretHash,
        publicKeyPem,
        firmwareVersion:
          typeof firmware_version === "string" && firmware_version.length > 0
            ? firmware_version
            : undefined,
        status:
          typeof status === "string" && status.length > 0
            ? status
            : "active",
      },
    });

    return res.status(201).json(serializeReceiver(receiver));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating receiver", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/v2/orgs/:org_id/receivers/:receiver_id",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const { org_id, receiver_id } = req.params;
    const body = req.body ?? {};

    const {
      display_name,
      location_label,
      latitude,
      longitude,
      auth_mode,
      shared_secret,
      public_key_pem,
      firmware_version,
      status,
    } = body as {
      display_name?: unknown;
      location_label?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      auth_mode?: unknown;
      shared_secret?: unknown;
      public_key_pem?: unknown;
      firmware_version?: unknown;
      status?: unknown;
    };

    try {
      const org = await prisma.org.findUnique({ where: { id: org_id } });
      if (!org) {
        return res.status(404).json({ error: "Org not found" });
      }

      const receiver = await prisma.receiver.findFirst({
        where: { id: receiver_id, orgId: org_id },
      });

      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }

      const data: Record<string, unknown> = {};

      if (typeof display_name === "string") {
        data.displayName = display_name;
      }

      if (typeof location_label === "string") {
        data.locationLabel = location_label;
      }

      if (typeof latitude === "number") {
        data.latitude = latitude;
      } else if (typeof latitude === "string" && latitude.length > 0) {
        data.latitude = Number(latitude);
      }

      if (typeof longitude === "number") {
        data.longitude = longitude;
      } else if (typeof longitude === "string" && longitude.length > 0) {
        data.longitude = Number(longitude);
      }

      let newAuthMode = receiver.authMode;
      if (typeof auth_mode === "string" && auth_mode.length > 0) {
        newAuthMode = auth_mode;
        data.authMode = newAuthMode;
      }

      if (newAuthMode === "hmac_shared_secret" && typeof shared_secret === "string") {
        data.sharedSecretHash = await argon2.hash(shared_secret);
      } else if (newAuthMode !== "hmac_shared_secret" && shared_secret !== undefined) {
        data.sharedSecretHash = null;
      }

      if (newAuthMode === "public_key" && typeof public_key_pem === "string") {
        data.publicKeyPem = public_key_pem;
      } else if (newAuthMode !== "public_key" && public_key_pem !== undefined) {
        data.publicKeyPem = null;
      }

      if (typeof firmware_version === "string") {
        data.firmwareVersion = firmware_version;
      }

      if (typeof status === "string") {
        data.status = status;
      }

      const updated = await prisma.receiver.update({
        where: { id: receiver_id },
        data,
      });

      return res.status(200).json(serializeReceiver(updated));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error updating receiver", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/v2/orgs/:org_id/presence", requireRole("auditor"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const receiverIdParam = req.query.receiver_id;
  const fromParam = req.query.from;
  const toParam = req.query.to;
  const resultParam = req.query.result;
  const limitParam = req.query.limit;

  const receiverId =
    typeof receiverIdParam === "string" && receiverIdParam.length > 0
      ? receiverIdParam
      : undefined;

  const result =
    typeof resultParam === "string" && resultParam.length > 0 ? resultParam : undefined;

  let from: Date | undefined;
  if (typeof fromParam === "string" && fromParam.length > 0) {
    const d = new Date(fromParam);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: "Invalid from timestamp" });
    }
    from = d;
  }

  let to: Date | undefined;
  if (typeof toParam === "string" && toParam.length > 0) {
    const d = new Date(toParam);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: "Invalid to timestamp" });
    }
    to = d;
  }

  let limit = 100;
  if (typeof limitParam === "string" && limitParam.length > 0) {
    const parsed = Number.parseInt(limitParam, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = parsed;
    }
  }
  if (limit > 1000) {
    limit = 1000;
  }

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const where: Prisma.PresenceEventWhereInput = {
      orgId: org.id,
    };

    if (receiverId) {
      where.receiverId = receiverId;
    }

    if (result) {
      where.authResult = result;
    }

    if (from || to) {
      where.serverTimestamp = {};
      if (from) {
        where.serverTimestamp.gte = from;
      }
      if (to) {
        where.serverTimestamp.lte = to;
      }
    }

    const events = await prisma.presenceEvent.findMany({
      where,
      orderBy: { serverTimestamp: "desc" },
      take: limit,
    });

    return res.status(200).json({
      events: events.map((evt) => ({
        id: evt.id,
        receiver_id: evt.receiverId,
        client_timestamp_ms: Number(evt.clientTimestampMs),
        server_timestamp: evt.serverTimestamp.toISOString(),
        time_slot: evt.timeSlot,
        version: evt.version,
        flags: evt.flags,
        token_prefix: evt.tokenPrefix,
        auth_result: evt.authResult,
        is_anonymous: evt.isAnonymous,
        reason: evt.reason ?? null,
        meta: evt.meta ?? null,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error querying presence events", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/metrics/realtime", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const windowSecondsParam = req.query.window_seconds;
  const receiverWindowParam = req.query.receivers_minutes;

  let windowSeconds = 60;
  if (typeof windowSecondsParam === "string") {
    const parsed = Number.parseInt(windowSecondsParam, 10);
    if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 300) {
      windowSeconds = parsed;
    }
  }

  let receiversMinutes = 5;
  if (typeof receiverWindowParam === "string") {
    const parsed = Number.parseInt(receiverWindowParam, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
      receiversMinutes = parsed;
    }
  }

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const sinceEvents = new Date(Date.now() - windowSeconds * 1000);
    const sinceReceivers = new Date(Date.now() - receiversMinutes * 60 * 1000);

    const [eventsCount, activeReceiversList, onlineUsers] = await Promise.all([
      prisma.presenceEvent.count({
        where: { orgId: org_id, serverTimestamp: { gte: sinceEvents } },
      }),
      prisma.presenceEvent.findMany({
        where: { orgId: org_id, serverTimestamp: { gte: sinceReceivers } },
        distinct: ["receiverId"],
        select: { receiverId: true },
      }),
      prisma.presenceSession.count({
        where: { orgId: org_id, endedAt: null },
      }),
    ]);

    const eventsPerSec = Number((eventsCount / windowSeconds).toFixed(2));

    return res.json({
      org_id,
      events_per_sec: eventsPerSec,
      events_window_seconds: windowSeconds,
      active_receivers: activeReceiversList.length,
      receivers_window_minutes: receiversMinutes,
      online_users: onlineUsers,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching realtime metrics", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as orgsRouter };
