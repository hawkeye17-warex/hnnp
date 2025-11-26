import { Router, Request, Response } from "express";
import argon2 from "argon2";
import crypto from "crypto";
import type { Org, Receiver, UserProfile, PresenceEvent, QuizSession, QuizQuestion } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { computeApiKeyHash } from "../security/apiKeys";
import { requireRole } from "../middleware/permissions";
import { requireCapability } from "../middleware/capabilities";
import { buildAuditContext, logAudit } from "../services/audit";
import { checkQuizPresence } from "../services/quizPresence";

const router = Router();

const API_KEY_SECRET = process.env.API_KEY_SECRET || "hnnp_api_key_secret";

// Protect all org/receiver admin routes with API key auth.
// NOTE: internal org creation endpoint is defined before auth middleware.

const ORG_TYPES = ["school", "factory", "office", "hospital", "gov", "other"];
const MODULES = [
  "attendance",
  "quizzes",
  "exams",
  "sessions",
  "shifts",
  "workzones",
  "safety",
  "access_control",
  "analytics",
  "hps_insights",
  "developer_api",
];

router.post("/internal/orgs/create", async (req: Request, res: Response) => {
  const { name, slug, org_type, enabled_modules } = (req.body ?? {}) as {
    name?: unknown;
    slug?: unknown;
    org_type?: unknown;
    enabled_modules?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "name is required" });
  }
  if (typeof slug !== "string" || slug.trim().length === 0) {
    return res.status(400).json({ error: "slug is required" });
  }
  const orgType = typeof org_type === "string" && ORG_TYPES.includes(org_type) ? org_type : "office";
  const enabledModules =
    Array.isArray(enabled_modules) && enabled_modules.every((m) => typeof m === "string" && MODULES.includes(m))
      ? (enabled_modules as string[])
      : [];

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
          orgType,
          enabledModules,
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

    await logAudit({
      action: "org_create",
      entityType: "org",
      entityId: orgId,
      orgId,
      details: { name, slug },
      actorKey: null,
      actorRole: "superadmin",
    });

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

// Simplified org config for single-org admin console
router.get("/api/org/config", requireRole("read-only"), async (req: Request, res: Response) => {
  try {
    const org = req.org ? req.org : await prisma.org.findUnique({ where: { id: req.orgId ?? "" } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    return res.json({
      org_id: org.id,
      org_name: org.name,
      org_type: (org as any).orgType ?? "office",
      enabled_modules: (org as any).enabledModules ?? [],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching org config", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

function serializeOrg(org: Org) {
  return {
    org_id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    config: org.config,
    org_type: (org as any).orgType ?? "office",
    enabled_modules: (org as any).enabledModules ?? [],
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

function serializeProfile(profile: UserProfile, opts?: { orgStatus?: string; userMissing?: boolean }) {
  const capsRaw = profile.capabilities;
  let capabilities: string[] = [];
  if (Array.isArray(capsRaw)) {
    capabilities = capsRaw.map((c) => String(c));
  } else if (typeof capsRaw === "string") {
    capabilities = [capsRaw];
  }
  return {
    id: profile.id,
    user_id: profile.userId,
    org_id: profile.orgId,
    type: profile.type,
    capabilities,
    created_at: profile.createdAt.toISOString(),
    org_status: opts?.orgStatus,
    user_missing: opts?.userMissing ?? false,
  };
}

function serializePresence(evt: PresenceEvent) {
  return {
    id: evt.id,
    org_id: evt.orgId,
    receiver_id: evt.receiverId,
    token_prefix: evt.tokenPrefix,
    auth_result: evt.authResult,
    server_timestamp: evt.serverTimestamp.toISOString(),
    client_timestamp_ms: Number(evt.clientTimestampMs),
    flags: evt.flags,
    user_ref: evt.userRef,
    meta: evt.meta ?? null,
  };
}

function serializeQuiz(session: QuizSession) {
  const settings = (session.settingsJson ?? {}) as any;
  return {
    id: session.id,
    org_id: session.orgId,
    course_id: session.courseId ?? null,
    receiver_id: session.receiverId ?? null,
    title: session.title,
    start_time: session.startTime.toISOString(),
    end_time: session.endTime.toISOString(),
    status: session.status,
    created_by: session.createdBy,
    settings_json: {
      require_presence: settings.require_presence ?? false,
      presence_window_minutes: settings.presence_window_minutes ?? 10,
      late_join_allowed: settings.late_join_allowed ?? false,
      results_visibility: settings.results_visibility ?? "submitted_only",
      ...(settings || {}),
    },
    test_mode: session.testMode,
    created_at: session.createdAt.toISOString(),
  };
}

type KeyType = "ADMIN_KEY" | "RECEIVER_KEY";

function mapKeyType(type: KeyType) {
  return type === "RECEIVER_KEY" ? { name: "RECEIVER_KEY", scopes: "receiver" } : { name: "ADMIN_KEY", scopes: "admin" };
}

function generateRawKey() {
  const randomPart = crypto.randomBytes(10).toString("hex"); // 20 chars
  const suffix = crypto.randomBytes(16).toString("hex");
  const rawKey = `hnnp_live_${randomPart}${suffix}`;
  const keyPrefix = `hnnp_live_${randomPart.slice(0, 10)}`;
  return { rawKey, keyPrefix };
}

type SystemSettings = {
  presence_expiry_seconds: number;
  rate_limit_per_minute: number;
  log_retention_days: number;
  notification_recipient: string;
  org_notification_email: string;
  email_template_subject: string;
  email_template_body: string;
  alert_receiver_offline: boolean;
  alert_key_rotation: boolean;
  alert_suspicious_activity: boolean;
  default_student_capabilities: string[];
  default_worker_capabilities: string[];
  auto_start_shift_on_presence: boolean;
  auto_end_shift_after_minutes: number;
  allow_manual_clock_in_out: boolean;
  allow_manual_break_edit: boolean;
};

const defaultSystemSettings: SystemSettings = {
  presence_expiry_seconds: 60 * 5,
  rate_limit_per_minute: 120,
  log_retention_days: 30,
  notification_recipient: "hnnp.nearid@gmail.com",
  org_notification_email: "",
  email_template_subject: "NearID notification",
  email_template_body: "Hello {{org_name}},\n\nThis is a message from NearID.\n\nThank you,\nNearID Team",
  alert_receiver_offline: true,
  alert_key_rotation: true,
  alert_suspicious_activity: true,
  default_student_capabilities: ["attendance", "quiz"],
  default_worker_capabilities: ["attendance", "shift", "breaks"],
  auto_start_shift_on_presence: false,
  auto_end_shift_after_minutes: 30,
  allow_manual_clock_in_out: true,
  allow_manual_break_edit: true,
};

export function normalizeSettings(partial: Partial<SystemSettings> | null | undefined): SystemSettings {
  return {
    presence_expiry_seconds:
      typeof partial?.presence_expiry_seconds === "number" && partial.presence_expiry_seconds > 0
        ? partial.presence_expiry_seconds
        : defaultSystemSettings.presence_expiry_seconds,
    rate_limit_per_minute:
      typeof partial?.rate_limit_per_minute === "number" && partial.rate_limit_per_minute > 0
        ? partial.rate_limit_per_minute
        : defaultSystemSettings.rate_limit_per_minute,
    log_retention_days:
      typeof partial?.log_retention_days === "number" && partial.log_retention_days > 0
        ? partial.log_retention_days
        : defaultSystemSettings.log_retention_days,
    notification_recipient:
      typeof partial?.notification_recipient === "string" && partial.notification_recipient.trim().length > 0
        ? partial.notification_recipient.trim()
        : defaultSystemSettings.notification_recipient,
    org_notification_email:
      typeof partial?.org_notification_email === "string" && partial.org_notification_email.trim().length > 0
        ? partial.org_notification_email.trim()
        : defaultSystemSettings.org_notification_email,
    email_template_subject:
      typeof partial?.email_template_subject === "string" && partial.email_template_subject.trim().length > 0
        ? partial.email_template_subject.trim()
        : defaultSystemSettings.email_template_subject,
    email_template_body:
      typeof partial?.email_template_body === "string" && partial.email_template_body.trim().length > 0
        ? partial.email_template_body
        : defaultSystemSettings.email_template_body,
    alert_receiver_offline:
      typeof partial?.alert_receiver_offline === "boolean"
        ? partial.alert_receiver_offline
        : defaultSystemSettings.alert_receiver_offline,
    alert_key_rotation:
      typeof partial?.alert_key_rotation === "boolean"
        ? partial.alert_key_rotation
        : defaultSystemSettings.alert_key_rotation,
    alert_suspicious_activity:
      typeof partial?.alert_suspicious_activity === "boolean"
        ? partial.alert_suspicious_activity
        : defaultSystemSettings.alert_suspicious_activity,
    default_student_capabilities:
      Array.isArray(partial?.default_student_capabilities) && partial.default_student_capabilities.every((c) => typeof c === "string")
        ? partial.default_student_capabilities
        : defaultSystemSettings.default_student_capabilities,
    default_worker_capabilities:
      Array.isArray(partial?.default_worker_capabilities) && partial.default_worker_capabilities.every((c) => typeof c === "string")
        ? partial.default_worker_capabilities
        : defaultSystemSettings.default_worker_capabilities,
    auto_start_shift_on_presence:
      typeof partial?.auto_start_shift_on_presence === "boolean"
        ? partial.auto_start_shift_on_presence
        : defaultSystemSettings.auto_start_shift_on_presence,
    auto_end_shift_after_minutes:
      typeof partial?.auto_end_shift_after_minutes === "number" && partial.auto_end_shift_after_minutes > 0
        ? partial.auto_end_shift_after_minutes
        : defaultSystemSettings.auto_end_shift_after_minutes,
    allow_manual_clock_in_out:
      typeof partial?.allow_manual_clock_in_out === "boolean"
        ? partial.allow_manual_clock_in_out
        : defaultSystemSettings.allow_manual_clock_in_out,
    allow_manual_break_edit:
      typeof partial?.allow_manual_break_edit === "boolean"
        ? partial.allow_manual_break_edit
        : defaultSystemSettings.allow_manual_break_edit,
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

    await logAudit({
      action: "receiver_create",
      entityType: "receiver",
      entityId: receiver.id,
      details: {
        display_name,
        location_label,
        auth_mode: authMode,
        firmware_version,
        status,
      },
      ...buildAuditContext(req),
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

      await logAudit({
        action: "receiver_update",
        entityType: "receiver",
        entityId: receiver_id,
        details: data as Record<string, unknown>,
        ...buildAuditContext(req),
      });

      return res.status(200).json(serializeReceiver(updated));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error updating receiver", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/v2/orgs/:org_id/keys", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const keys = await prisma.apiKey.findMany({
      where: { orgId: org_id },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      keys.map((k) => ({
        type: k.name,
        key_prefix: k.keyPrefix,
        created_at: k.createdAt.toISOString(),
        last_rotated_at: k.revokedAt ? k.revokedAt.toISOString() : undefined,
        revoked_at: k.revokedAt ? k.revokedAt.toISOString() : undefined,
        scopes: k.scopes,
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing api keys", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/keys", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { type } = (req.body ?? {}) as { type?: KeyType };
  const keyType: KeyType = type === "RECEIVER_KEY" ? "RECEIVER_KEY" : "ADMIN_KEY";

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const { name, scopes } = mapKeyType(keyType);
    const { rawKey, keyPrefix } = generateRawKey();
    const keyHash = computeApiKeyHash(rawKey, API_KEY_SECRET);

    await prisma.apiKey.create({
      data: {
        orgId: org_id,
        name,
        scopes,
        keyPrefix,
        keyHash,
      },
    });

    await logAudit({
      action: "api_key_generate",
      entityType: "api_key",
      entityId: keyPrefix,
      details: { type: name, scopes },
      ...buildAuditContext(req),
    });

    return res.status(201).json({ key: rawKey, type: name });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error generating api key", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/v2/orgs/:org_id/keys/:type/rotate",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const { org_id, type } = req.params;
    const keyType: KeyType = type === "RECEIVER_KEY" ? "RECEIVER_KEY" : "ADMIN_KEY";

    try {
      const org = await prisma.org.findUnique({ where: { id: org_id } });
      if (!org) return res.status(404).json({ error: "Org not found" });

      const { name, scopes } = mapKeyType(keyType);
      const { rawKey, keyPrefix } = generateRawKey();
      const keyHash = computeApiKeyHash(rawKey, API_KEY_SECRET);

      await prisma.$transaction([
        prisma.apiKey.updateMany({
          where: { orgId: org_id, name },
          data: { revokedAt: new Date() },
        }),
        prisma.apiKey.create({
          data: { orgId: org_id, name, scopes, keyPrefix, keyHash },
        }),
      ]);

      await logAudit({
        action: "api_key_rotate",
        entityType: "api_key",
        entityId: keyPrefix,
        details: { type: name, scopes },
        ...buildAuditContext(req),
      });

      return res.status(201).json({ key: rawKey, type: name });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error rotating api key", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/v2/orgs/:org_id/settings", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    const config = (org.config ?? {}) as any;
    const settings = normalizeSettings(config.systemSettings as Partial<SystemSettings> | undefined);
    return res.json({ system_settings: settings });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching system settings", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/v2/orgs/:org_id/settings", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const body = (req.body ?? {}) as Partial<SystemSettings>;

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const currentConfig = (org.config ?? {}) as any;
    const merged = normalizeSettings({ ...(currentConfig.systemSettings as any), ...body });

    const updated = await prisma.org.update({
      where: { id: org_id },
      data: {
        config: {
          ...(currentConfig || {}),
          systemSettings: merged,
        },
      },
    });

    const shiftKeys = new Set([
      "auto_start_shift_on_presence",
      "auto_end_shift_after_minutes",
      "allow_manual_clock_in_out",
      "allow_manual_break_edit",
    ]);
    const changedShiftPolicy = Object.keys(body || {}).some((k) => shiftKeys.has(k));

    await logAudit({
      action: changedShiftPolicy ? "shift_policy_update" : "system_settings_update",
      entityType: "system_settings",
      entityId: org_id,
      details: merged,
      ...buildAuditContext(req),
    });

    return res.json({ system_settings: normalizeSettings((updated.config as any)?.systemSettings) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error updating system settings", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/profiles", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const qParam = req.query.q;
  const search = typeof qParam === "string" ? qParam.trim() : "";

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const where: Prisma.UserProfileWhereInput = { orgId: org_id };
    if (search) {
      where.OR = [
        { userId: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
      ];
    }

    const profiles = await prisma.userProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const orgStatus = org.status;
    const userIds = profiles.map((p) => p.userId);
    const users = await prisma.adminUser.findMany({
      where: {
        OR: [{ id: { in: userIds } }, { email: { in: userIds } }],
      },
      select: { id: true, email: true, status: true },
    });

    const profilesWithFlags = profiles.map((p) => {
      const match = users.find((u) => u.id === p.userId || u.email === p.userId);
      const userMissing = !match || (typeof match.status === "string" && match.status.toLowerCase() !== "active");
      return serializeProfile(p, { orgStatus, userMissing });
    });

    return res.json(profilesWithFlags);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing profiles", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/profiles", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { user_id, type, capabilities } = req.body ?? {};

  if (typeof user_id !== "string" || user_id.trim().length === 0) {
    return res.status(400).json({ error: "user_id is required" });
  }
  if (typeof type !== "string" || type.trim().length === 0) {
    return res.status(400).json({ error: "type is required" });
  }

  const capsArray =
    Array.isArray(capabilities) && capabilities.every((c) => typeof c === "string")
      ? capabilities
      : typeof capabilities === "string"
        ? capabilities.split(",").map((c: string) => c.trim()).filter(Boolean)
        : [];

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    const settings = normalizeSettings((org.config as any)?.systemSettings);
    const typeLower = type.trim().toLowerCase();
    const defaults =
      typeLower.includes("student")
        ? settings.default_student_capabilities
        : typeLower.includes("worker")
          ? settings.default_worker_capabilities
          : [];

    const profile = await prisma.userProfile.create({
      data: {
        userId: user_id,
        orgId: org_id,
        type: type.trim(),
        capabilities: capsArray.length > 0 ? capsArray : defaults,
      },
    });

    await logAudit({
      action: "user_profile_create",
      entityType: "user_profile",
      entityId: profile.id,
      details: { user_id, type, capabilities: capsArray },
      ...buildAuditContext(req),
    });

    return res.status(201).json(serializeProfile(profile));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating profile", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/v2/orgs/:org_id/profiles/:profile_id", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id, profile_id } = req.params;
  const { type, capabilities } = req.body ?? {};

  const capsArray =
    Array.isArray(capabilities) && capabilities.every((c) => typeof c === "string")
      ? capabilities
      : typeof capabilities === "string"
        ? capabilities.split(",").map((c: string) => c.trim()).filter(Boolean)
        : undefined;

  const data: Prisma.UserProfileUpdateInput = {};
  if (typeof type === "string" && type.trim().length > 0) data.type = type.trim();
  if (capsArray !== undefined) data.capabilities = capsArray;

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const updated = await prisma.userProfile.update({
      where: { id: profile_id },
      data,
    });

    await logAudit({
      action: "user_profile_update",
      entityType: "user_profile",
      entityId: profile_id,
      details: data as Record<string, unknown>,
      ...buildAuditContext(req),
    });

    return res.json(serializeProfile(updated));
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error updating profile", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "User profile not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete(
  "/v2/orgs/:org_id/profiles/:profile_id",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const { org_id, profile_id } = req.params;
    try {
      const org = await prisma.org.findUnique({ where: { id: org_id } });
      if (!org) return res.status(404).json({ error: "Org not found" });

      await prisma.userProfile.delete({ where: { id: profile_id } });

      await logAudit({
        action: "user_profile_delete",
        entityType: "user_profile",
        entityId: profile_id,
        details: null,
        ...buildAuditContext(req),
      });

      return res.status(204).send();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error deleting profile", err);
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "User profile not found" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/v2/orgs/:org_id/profiles/:profile_id/activity",
  requireRole("auditor"),
  async (req: Request, res: Response) => {
    const { org_id, profile_id } = req.params;
    try {
      const profile = await prisma.userProfile.findFirst({ where: { id: profile_id, orgId: org_id } });
      if (!profile) return res.status(404).json({ error: "User profile not found" });

      const presence = await prisma.presenceEvent.findMany({
        where: { orgId: org_id, userRef: profile.userId },
        orderBy: { serverTimestamp: "desc" },
        take: 20,
      });

      return res.json({
        profile: serializeProfile(profile),
        presence_logs: presence.map(serializePresence),
        student_attendance: profile.type.toLowerCase().includes("student") ? [] : undefined,
        worker_shifts: profile.type.toLowerCase().includes("worker") ? [] : undefined,
        worker_breaks: profile.type.toLowerCase().includes("worker") ? [] : undefined,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching profile activity", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/v2/orgs/:org_id/profiles/:profile_id/worker-report",
  requireRole("auditor"),
  async (req: Request, res: Response) => {
    const { org_id, profile_id } = req.params;
    const { from: fromParam, to: toParam, format } = req.query;

    try {
      const profile = await prisma.userProfile.findFirst({ where: { id: profile_id, orgId: org_id } });
      if (!profile) return res.status(404).json({ error: "User profile not found" });

      const to = typeof toParam === "string" ? new Date(toParam) : new Date();
      const from =
        typeof fromParam === "string"
          ? new Date(fromParam)
          : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days default

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({ error: "Invalid from/to" });
      }

      const shifts = await prisma.shift.findMany({
        where: {
          orgId: org_id,
          profileId: profile_id,
          startTime: { gte: from, lte: to },
        },
        include: { breaks: true },
        orderBy: { startTime: "asc" },
      });

      const now = new Date();
      const summarizeDuration = (s: typeof shifts[number]) => {
        const end = s.endTime ?? now;
        const dur = s.totalSeconds ?? Math.max(0, Math.floor((end.getTime() - s.startTime.getTime()) / 1000));
        const breakSeconds =
          s.breaks?.reduce(
            (acc, b) =>
              acc +
              (b.totalSeconds ??
                (b.endTime && b.startTime ? Math.max(0, Math.floor((b.endTime.getTime() - b.startTime.getTime()) / 1000)) : 0)),
            0,
          ) ?? 0;
        return { dur, breakSeconds, end };
      };

      let totalSeconds = 0;
      let totalBreakSeconds = 0;
      const daily: Record<string, number> = {};
      const weekly: Record<string, number> = {};
      const monthly: Record<string, number> = {};

      const rows = shifts.map((s) => {
        const { dur, breakSeconds, end } = summarizeDuration(s);
        totalSeconds += dur;
        totalBreakSeconds += breakSeconds;
        const dayKey = s.startTime.toISOString().slice(0, 10);
        daily[dayKey] = (daily[dayKey] ?? 0) + dur;
        const weekKey = `${s.startTime.getUTCFullYear()}-W${getWeekNumber(s.startTime)}`;
        weekly[weekKey] = (weekly[weekKey] ?? 0) + dur;
        const monthKey = `${s.startTime.getUTCFullYear()}-${String(s.startTime.getUTCMonth() + 1).padStart(2, "0")}`;
        monthly[monthKey] = (monthly[monthKey] ?? 0) + dur;
        return {
          id: s.id,
          start_time: s.startTime.toISOString(),
          end_time: end ? end.toISOString() : null,
          total_seconds: dur,
          break_seconds: breakSeconds,
          status: s.status,
        };
      });

      if (format === "csv") {
        const header = ["id", "start_time", "end_time", "total_seconds", "break_seconds", "status"];
        const csv = [header.join(","), ...rows.map((r) => header.map((h) => r[h as keyof typeof r] ?? "").join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=\"worker_report_${profile_id}.csv\"`);
        return res.send(csv);
      }

      const mapEntries = (obj: Record<string, number>) =>
        Object.entries(obj)
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([label, seconds]) => ({ label, seconds }));

      return res.json({
        profile: serializeProfile(profile),
        range: { from: from.toISOString(), to: to.toISOString() },
        totals: {
          total_seconds: totalSeconds,
          total_break_seconds: totalBreakSeconds,
          total_hours: Number((totalSeconds / 3600).toFixed(2)),
        },
        daily_hours: mapEntries(daily),
        weekly_hours: mapEntries(weekly),
        monthly_hours: mapEntries(monthly),
        rows,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error building worker report", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday in current week decides the year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return String(weekNo).padStart(2, "0");
}

router.get("/v2/orgs/:org_id/quizzes", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const statusParam = req.query.status;
  const courseParam = req.query.course_id;

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const where: Prisma.QuizSessionWhereInput = { orgId: org_id };
    if (typeof statusParam === "string" && statusParam.length > 0) {
      where.status = statusParam;
    }
    if (typeof courseParam === "string" && courseParam.length > 0) {
      where.courseId = courseParam;
    }

    const quizzes = await prisma.quizSession.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 200,
    });

    return res.json(quizzes.map(serializeQuiz));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing quizzes", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/quizzes", requireRole("admin"), requireCapability("quiz:create"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const {
    title,
    course_id,
    receiver_id,
    start_time,
    duration_minutes,
    status,
    questions,
    settings_json,
    test_mode,
  } = req.body ?? {};

  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }

  const start = typeof start_time === "string" ? new Date(start_time) : new Date();
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ error: "Invalid start_time" });
  }
    const durationMs =
      typeof duration_minutes === "number" && duration_minutes > 0
        ? duration_minutes * 60 * 1000
        : 30 * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);

    const quizStatus = typeof status === "string" && status.trim().length > 0 ? status : "draft";

  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const quiz = await prisma.quizSession.create({
      data: {
        orgId: org_id,
        courseId: typeof course_id === "string" && course_id.length > 0 ? course_id : undefined,
        receiverId: typeof receiver_id === "string" && receiver_id.length > 0 ? receiver_id : undefined,
        title: title.trim(),
        startTime: start,
        endTime: end,
        status: quizStatus,
        createdBy: req.apiKey?.keyPrefix ?? "unknown",
        settingsJson: {
          duration_minutes: duration_minutes ?? 30,
          require_presence: settings_json?.require_presence ?? false,
          presence_window_minutes: settings_json?.presence_window_minutes ?? 10,
          late_join_allowed: settings_json?.late_join_allowed ?? false,
          results_visibility: settings_json?.results_visibility ?? "submitted_only",
          ...settings_json,
        },
        testMode: Boolean(test_mode),
      },
    });

    const quizQuestions: Prisma.QuizQuestionCreateManyInput[] = Array.isArray(questions)
      ? questions
          .filter((q: any) => q && typeof q.text === "string")
          .map((q: any) => ({
            quizId: quiz.id,
            type: typeof q.type === "string" ? q.type : "mcq",
            text: q.text,
            optionsJson: q.options_json ?? q.options ?? null,
            correctOption: typeof q.correct_option === "string" ? q.correct_option : null,
            timeLimitSec:
              typeof q.time_limit_sec === "number" && Number.isFinite(q.time_limit_sec)
                ? q.time_limit_sec
                : null,
          }))
      : [];

    if (quizQuestions.length > 0) {
      await prisma.quizQuestion.createMany({ data: quizQuestions });
    }

    await logAudit({
      action: "quiz_create",
      entityType: "quiz",
      entityId: quiz.id,
      details: { title, status: quizStatus, question_count: quizQuestions.length },
      ...buildAuditContext(req),
    });

    return res.status(201).json(serializeQuiz(quiz));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/quizzes/:quiz_id", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    return res.json(serializeQuiz(quiz));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/quizzes/:quiz_id/start", requireRole("admin"), requireCapability("quiz:start"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const now = new Date();
    const updated = await prisma.quizSession.update({
      where: { id: quiz_id },
      data: {
        status: "running",
        startTime: quiz.startTime > now ? now : quiz.startTime,
      },
    });

    await logAudit({
      action: "quiz_start",
      entityType: "quiz",
      entityId: quiz_id,
      details: { start_time: updated.startTime, status: updated.status },
      ...buildAuditContext(req),
    });

    return res.json(serializeQuiz(updated));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error starting quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/quizzes/:quiz_id/end", requireRole("admin"), requireCapability("quiz:end"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const now = new Date();
    const updated = await prisma.quizSession.update({
      where: { id: quiz_id },
      data: {
        status: "closed",
        endTime: now,
      },
    });

    await logAudit({
      action: "quiz_end",
      entityType: "quiz",
      entityId: quiz_id,
      details: { end_time: updated.endTime, status: updated.status },
      ...buildAuditContext(req),
    });

    return res.json(serializeQuiz(updated));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error ending quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/quizzes/:quiz_id/notify", requireRole("admin"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  const { type } = req.body ?? {};
  if (type !== "published" && type !== "scores") {
    return res.status(400).json({ error: "type must be 'published' or 'scores'" });
  }
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    // Placeholder: integrate actual email delivery here.
    await logAudit({
      action: "quiz_notify",
      entityType: "quiz",
      entityId: quiz_id,
      details: { type },
      ...buildAuditContext(req),
    });

    return res.json({ ok: true, message: "Notification queued", type });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error notifying quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/v2/orgs/:org_id/quizzes/:quiz_id", requireRole("admin"), requireCapability("quiz:create"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  const {
    title,
    course_id,
    receiver_id,
    start_time,
    duration_minutes,
    status,
    questions,
    settings_json,
    test_mode,
  } = req.body ?? {};

  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const hasQuestions = Array.isArray(questions) && questions.length > 0;
    if (hasQuestions && quiz.status !== "draft") {
      await logAudit({
        action: "quiz_question_edit_blocked",
        entityType: "quiz",
        entityId: quiz_id,
        details: { status: quiz.status },
        ...buildAuditContext(req),
      });
      return res.status(400).json({ error: "Cannot edit questions after publish" });
    }

    const updates: Prisma.QuizSessionUpdateInput = {};
    if (typeof title === "string" && title.trim().length > 0) updates.title = title.trim();
    if (typeof course_id === "string") updates.courseId = course_id || null;
    if (typeof receiver_id === "string") updates.receiver = { connect: receiver_id ? { id: receiver_id } : undefined };
    if (typeof test_mode === "boolean") updates.testMode = test_mode;

    let startTime = quiz.startTime;
    if (typeof start_time === "string") {
      const d = new Date(start_time);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid start_time" });
      startTime = d;
      updates.startTime = d;
    }
    if (typeof duration_minutes === "number" && duration_minutes > 0) {
      const endTime = new Date(startTime.getTime() + duration_minutes * 60 * 1000);
      updates.endTime = endTime;
      if (!updates.startTime) updates.startTime = startTime;
    }

    if (typeof status === "string" && status.trim().length > 0) {
      updates.status = status.trim();
    }

    if (settings_json && typeof settings_json === "object") {
      const merged = {
        ...(typeof quiz.settingsJson === "object" && quiz.settingsJson !== null ? (quiz.settingsJson as Record<string, unknown>) : {}),
        ...(settings_json as Record<string, unknown>),
      };
      updates.settingsJson = merged as Prisma.InputJsonValue;
    }

    const updated = await prisma.quizSession.update({
      where: { id: quiz_id },
      data: updates,
    });

    if (hasQuestions) {
      const quizQuestions: Prisma.QuizQuestionCreateManyInput[] = questions
        .filter((q: any) => q && typeof q.text === "string")
        .map((q: any) => ({
          quizId: quiz_id,
          type: typeof q.type === "string" ? q.type : "mcq",
          text: q.text,
          optionsJson: q.options_json ?? q.options ?? null,
          correctOption: typeof q.correct_option === "string" ? q.correct_option : null,
          timeLimitSec: typeof q.time_limit_sec === "number" ? q.time_limit_sec : null,
        }));
      await prisma.quizQuestion.deleteMany({ where: { quizId: quiz_id } });
      if (quizQuestions.length > 0) {
        await prisma.quizQuestion.createMany({ data: quizQuestions });
      }
      await logAudit({
        action: "quiz_questions_replace",
        entityType: "quiz",
        entityId: quiz_id,
        details: { question_count: quizQuestions.length },
        ...buildAuditContext(req),
      });
    }

    if (updates.status && typeof updates.status === "string" && updates.status !== quiz.status) {
      const to = updates.status;
      await logAudit({
        action: to.toLowerCase() === "live" ? "quiz_publish" : "quiz_status_change",
        entityType: "quiz",
        entityId: quiz_id,
        details: { from: quiz.status, to },
        ...buildAuditContext(req),
      });
    } else {
      await logAudit({
        action: "quiz_update",
        entityType: "quiz",
        entityId: quiz_id,
        details: updates as Record<string, unknown>,
        ...buildAuditContext(req),
      });
    }

    return res.json(serializeQuiz(updated));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error updating quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/v2/orgs/:org_id/quizzes/:quiz_id", requireRole("admin"), requireCapability("quiz:create"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz_id } });
    await prisma.quizSubmission.deleteMany({ where: { quizId: quiz_id } });
    await prisma.quizSession.delete({ where: { id: quiz_id } });

    await logAudit({
      action: "quiz_delete",
      entityType: "quiz",
      entityId: quiz_id,
      details: null,
      ...buildAuditContext(req),
    });

    return res.status(204).send();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error deleting quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/quizzes/:quiz_id/submit", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  const { profile_id, user_ref } = req.body ?? {};

  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const settings = (quiz.settingsJson ?? {}) as any;
    const requirePresence = Boolean(settings.require_presence);
    const presenceWindowMinutes = typeof settings.presence_window_minutes === "number" ? settings.presence_window_minutes : 10;
    const lateJoinAllowed = Boolean(settings.late_join_allowed);

    const now = new Date();
    if (!lateJoinAllowed && quiz.startTime > now) {
      return res.status(400).json({ error: "Quiz not started yet" });
    }
    if (quiz.endTime < now) {
      return res.status(400).json({ error: "Quiz closed" });
    }

    if (requirePresence) {
      const presence = await checkQuizPresence({
        orgId: org_id,
        profileId: typeof profile_id === "string" ? profile_id : undefined,
        userRef: typeof user_ref === "string" && user_ref.length > 0 ? user_ref : undefined,
        receiverId: quiz.receiverId ?? undefined,
        windowMinutes: presenceWindowMinutes,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
      });
      if (!presence.ok) {
        return res.status(403).json({ error: presence.reason });
      }
    }

    return res.json({ ok: true, quiz: serializeQuiz(quiz) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error submitting quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/quizzes/:quiz_id/submissions", requireRole("auditor"), requireCapability("quiz:submissions"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  const exportType = req.query.export;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId: quiz_id },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });

    if (exportType === "csv") {
      const header = ["id", "profile_id", "submitted_at", "score", "status"];
      const lines = submissions.map((s) =>
        [
          s.id,
          s.profileId,
          s.submittedAt.toISOString(),
          s.score ?? "",
          s.status,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="quiz_${quiz_id}_submissions.csv"`);
      return res.send(csv);
    }

    const avgScore =
      submissions.length > 0
        ? submissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / submissions.length
        : 0;

    return res.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        quiz_id: s.quizId,
        profile_id: s.profileId,
        submitted_at: s.submittedAt.toISOString(),
        answers_json: s.answersJson,
        score: s.score,
        status: s.status,
        created_at: s.createdAt.toISOString(),
      })),
      stats: {
        average_score: avgScore,
        submission_count: submissions.length,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching submissions", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/quizzes/:quiz_id/presence", requireRole("auditor"), async (req: Request, res: Response) => {
  const { org_id, quiz_id } = req.params;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org_id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const start = quiz.startTime;
    const end = quiz.endTime;
    const receiverId = quiz.receiverId;

    const where: Prisma.PresenceEventWhereInput = {
      orgId: org_id,
      serverTimestamp: { gte: start, lte: end },
    };
    if (receiverId) where.receiverId = receiverId;

    const presence = await prisma.presenceEvent.findMany({
      where,
      orderBy: { serverTimestamp: "desc" },
      take: 500,
    });

    return res.json({
      presence_logs: presence.map((p) => ({
        id: p.id,
        receiver_id: p.receiverId,
        user_ref: p.userRef,
        server_timestamp: p.serverTimestamp.toISOString(),
        token_prefix: p.tokenPrefix,
        auth_result: p.authResult,
      })),
      window: { start: start.toISOString(), end: end.toISOString(), receiver_id: receiverId },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching quiz presence", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/quizzes/metrics/summary", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const quizzesThisWeek = await prisma.quizSession.count({
      where: { orgId: org_id, startTime: { gte: startOfWeek } },
    });

    const liveQuizzes = await prisma.quizSession.findMany({
      where: { orgId: org_id, status: "running" },
      select: { id: true, title: true, startTime: true, endTime: true },
    });

    const submissionsThisWeek = await prisma.quizSubmission.count({
      where: { quiz: { orgId: org_id, startTime: { gte: startOfWeek } } },
    });

    return res.json({
      quizzes_this_week: quizzesThisWeek,
      submissions_this_week: submissionsThisWeek,
      live_quizzes: liveQuizzes.map((q) => ({
        id: q.id,
        title: q.title,
        start_time: q.startTime.toISOString(),
        end_time: q.endTime.toISOString(),
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching quiz summary", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/shifts", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { from, to, status, profile_id, max_hours, max_breaks, max_break_minutes } = req.query;

  try {
    const where: Prisma.ShiftWhereInput = { orgId: org_id };
    if (typeof status === "string" && status.length > 0) {
      where.status = status;
    }
    if (typeof profile_id === "string" && profile_id.length > 0) {
      where.profileId = profile_id;
    }
    if (typeof from === "string" || typeof to === "string") {
      where.startTime = {};
      if (typeof from === "string") {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) {
          where.startTime.gte = d;
        }
      }
      if (typeof to === "string") {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          where.startTime.lte = d;
        }
      }
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: { breaks: true, profile: true },
      orderBy: { startTime: "desc" },
      take: 200,
    });

    const maxShiftSeconds =
      typeof max_hours === "string" && Number.isFinite(Number(max_hours)) && Number(max_hours) > 0
        ? Number(max_hours) * 3600
        : 12 * 3600;
    const maxBreaksCount =
      typeof max_breaks === "string" && Number.isFinite(Number(max_breaks)) && Number(max_breaks) > 0
        ? Number(max_breaks)
        : 3;
    const maxBreakSeconds =
      typeof max_break_minutes === "string" && Number.isFinite(Number(max_break_minutes)) && Number(max_break_minutes) > 0
        ? Number(max_break_minutes) * 60
        : 30 * 60;

    const results = [];
    for (const s of shifts) {
      const now = new Date();
      const end = s.endTime ?? now;
      const totalSeconds = s.totalSeconds ?? Math.max(0, Math.floor((end.getTime() - s.startTime.getTime()) / 1000));
      const totalBreakSeconds =
        s.breaks?.reduce(
          (acc, b) =>
            acc +
            (b.totalSeconds ??
              (b.endTime && b.startTime ? Math.max(0, Math.floor((b.endTime.getTime() - b.startTime.getTime()) / 1000)) : 0)),
          0,
        ) ?? 0;

      let hasPresence = false;
      const userRef = s.profile?.userId ?? s.profileId;
      if (userRef) {
        const evt = await prisma.presenceEvent.findFirst({
          where: { orgId: org_id, userRef, serverTimestamp: { gte: s.startTime, lte: end } },
          select: { id: true },
        });
        hasPresence = Boolean(evt);
      }

      const anomalies: string[] = [];
      if (totalSeconds > maxShiftSeconds) anomalies.push("long_shift");
      if ((s.breaks?.length ?? 0) > maxBreaksCount) anomalies.push("too_many_breaks");
      if (s.breaks?.some((b) => {
        const dur = b.totalSeconds ?? (b.endTime && b.startTime ? Math.max(0, Math.floor((b.endTime.getTime() - b.startTime.getTime()) / 1000)) : 0);
        return dur > maxBreakSeconds;
      })) {
        anomalies.push("long_break");
      }
      if (!hasPresence) anomalies.push("no_presence");

      results.push({
        id: s.id,
        profile_id: s.profileId,
        user_id: s.profile?.userId ?? null,
        org_id: s.orgId,
        location_id: s.locationId,
        start_time: s.startTime.toISOString(),
        end_time: s.endTime ? s.endTime.toISOString() : null,
        total_seconds: totalSeconds,
        total_break_seconds: totalBreakSeconds,
        breaks_count: s.breaks?.length ?? 0,
        created_by: s.createdBy,
        closed_by: s.closedBy,
        status: s.status,
        created_at: s.createdAt.toISOString(),
        edited_by: s.editedBy,
        edited_at: s.editedAt ? s.editedAt.toISOString() : null,
        anomalies,
        has_presence: hasPresence,
      });
    }

    return res.json(results);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching shifts", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/breaks", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { profile_id, shift_id, active } = req.query;
  try {
    const where: Prisma.BreakWhereInput = { shift: { is: { orgId: org_id } } };
    if (typeof profile_id === "string" && profile_id.length > 0) {
      where.shift = { is: { orgId: org_id, profileId: profile_id } };
    }
    if (typeof shift_id === "string" && shift_id.length > 0) {
      where.shiftId = shift_id;
    }
    if (active === "true") {
      where.endTime = null;
    }

    const breaks = await prisma.break.findMany({
      where,
      include: { shift: true },
      orderBy: { startTime: "desc" },
      take: 200,
    });

    return res.json(
      breaks.map((b) => ({
        id: b.id,
        shift_id: b.shiftId,
        org_id: b.shift?.orgId ?? null,
        profile_id: b.shift?.profileId ?? null,
        start_time: b.startTime.toISOString(),
        end_time: b.endTime ? b.endTime.toISOString() : null,
        total_seconds: b.totalSeconds,
        type: b.type,
        created_at: b.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing breaks", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/shifts/:shift_id", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id, shift_id } = req.params;
  try {
    const shift = await prisma.shift.findFirst({ where: { id: shift_id, orgId: org_id }, include: { profile: true } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    const breaks = await prisma.break.findMany({
      where: { shiftId: shift_id },
      orderBy: { startTime: "asc" },
    });

    return res.json({
      shift: {
        id: shift.id,
        profile_id: shift.profileId,
        org_id: shift.orgId,
        location_id: shift.locationId,
        start_time: shift.startTime.toISOString(),
        end_time: shift.endTime ? shift.endTime.toISOString() : null,
        total_seconds: shift.totalSeconds,
        created_by: shift.createdBy,
        closed_by: shift.closedBy,
        status: shift.status,
        created_at: shift.createdAt.toISOString(),
        edited_by: shift.editedBy,
        edited_at: shift.editedAt ? shift.editedAt.toISOString() : null,
        user_id: shift.profile?.userId ?? null,
      },
      breaks: breaks.map((b) => ({
        id: b.id,
        shift_id: b.shiftId,
        start_time: b.startTime.toISOString(),
        end_time: b.endTime ? b.endTime.toISOString() : null,
        total_seconds: b.totalSeconds,
        type: b.type,
        created_at: b.createdAt.toISOString(),
        edited_by: b.editedBy,
        edited_at: b.editedAt ? b.editedAt.toISOString() : null,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching shift detail", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/shifts/live", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const now = new Date();
    const activeShifts = await prisma.shift.findMany({
      where: {
        orgId: org_id,
        OR: [{ endTime: null }, { status: { notIn: ["closed", "ended", "complete"] } }],
      },
      include: { profile: true },
      orderBy: { startTime: "asc" },
      take: 200,
    });

    const lastPings: Record<string, string | null> = {};
    await Promise.all(
      activeShifts.map(async (s) => {
        const userRef = s.profile?.userId;
        if (!userRef) return;
        const evt = await prisma.presenceEvent.findFirst({
          where: { orgId: org_id, userRef },
          orderBy: { serverTimestamp: "desc" },
        });
        lastPings[s.id] = evt?.receiverId ?? null;
      }),
    );

    const activeBreaks = await prisma.break.findMany({
      where: { endTime: null, shift: { orgId: org_id } },
      include: { shift: { include: { profile: true } } },
      orderBy: { startTime: "asc" },
      take: 200,
    });

    return res.json({
      on_shift: activeShifts.map((s) => ({
        id: s.id,
        profile_id: s.profileId,
        user_id: s.profile?.userId ?? null,
        start_time: s.startTime.toISOString(),
        status: s.status,
        duration_seconds: Math.max(0, Math.floor((now.getTime() - s.startTime.getTime()) / 1000)),
        last_receiver_id: lastPings[s.id] ?? null,
      })),
      on_break: activeBreaks.map((b) => ({
        id: b.id,
        shift_id: b.shiftId,
        profile_id: b.shift?.profileId ?? null,
        user_id: b.shift?.profile?.userId ?? null,
        start_time: b.startTime.toISOString(),
        duration_seconds: Math.max(0, Math.floor((now.getTime() - b.startTime.getTime()) / 1000)),
        type: b.type,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching live shifts", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/v2/orgs/:org_id/shifts/:shift_id", requireRole("shift_manager"), async (req: Request, res: Response) => {
  const { org_id, shift_id } = req.params;
  const { end_time, status } = req.body ?? {};
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });

    const settings = normalizeSettings((org.config as any)?.systemSettings);
    if (!settings.allow_manual_clock_in_out) {
      return res.status(403).json({ error: "Manual clock in/out is disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { id: shift_id, orgId: org_id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const data: Prisma.ShiftUpdateInput = {
      editedBy: req.apiKey?.keyPrefix ?? "unknown",
      editedAt: new Date(),
    };
    let statusChanged = false;
    let statusFrom = shift.status;
    let statusTo = shift.status;
    if (typeof end_time === "string") {
      const end = new Date(end_time);
      if (Number.isNaN(end.getTime())) return res.status(400).json({ error: "Invalid end_time" });
      data.endTime = end;
      const totalSeconds = Math.floor((end.getTime() - shift.startTime.getTime()) / 1000);
      data.totalSeconds = totalSeconds > 0 ? totalSeconds : shift.totalSeconds ?? 0;
    }
    if (typeof status === "string" && status.trim().length > 0) {
      data.status = status.trim();
      statusChanged = data.status !== shift.status;
      statusTo = data.status;
    }

    const updated = await prisma.shift.update({ where: { id: shift_id }, data });

    await logAudit({
      action: statusChanged ? "shift_status_change" : "shift_adjust",
      entityType: "shift",
      entityId: shift_id,
      details: { ...data, from: statusFrom, to: statusTo, manual: true } as Record<string, unknown>,
      ...buildAuditContext(req),
    });

    return res.json({
      id: updated.id,
      profile_id: updated.profileId,
      org_id: updated.orgId,
      location_id: updated.locationId,
      start_time: updated.startTime.toISOString(),
      end_time: updated.endTime ? updated.endTime.toISOString() : null,
      total_seconds: updated.totalSeconds,
      status: updated.status,
      edited_by: updated.editedBy,
      edited_at: updated.editedAt ? updated.editedAt.toISOString() : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error adjusting shift", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/shifts/summary", requireRole("auditor"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { profile_id } = req.query;
  try {
    const where: Prisma.ShiftWhereInput = { orgId: org_id };
    if (typeof profile_id === "string" && profile_id.length > 0) {
      where.profileId = profile_id;
    }
    const shifts = await prisma.shift.findMany({
      where,
      include: { breaks: true },
    });
    const totalSec = shifts.reduce((sum, s) => {
      const end = s.endTime ?? new Date();
      const dur = s.totalSeconds ?? Math.max(0, Math.floor((end.getTime() - s.startTime.getTime()) / 1000));
      return sum + dur;
    }, 0);
    const totalBreakSec =
      shifts.reduce(
        (sum, s) =>
          sum +
          (s.breaks?.reduce(
            (acc, b) =>
              acc +
              (b.totalSeconds ??
                (b.endTime && b.startTime ? Math.max(0, Math.floor((b.endTime.getTime() - b.startTime.getTime()) / 1000)) : 0)),
            0,
          ) ?? 0),
        0,
      );
    return res.json({
      shift_count: shifts.length,
      total_seconds: totalSec,
      total_hours: Number((totalSec / 3600).toFixed(2)),
      total_break_seconds: totalBreakSec,
      total_break_hours: Number((totalBreakSec / 3600).toFixed(2)),
      average_shift_hours: shifts.length ? Number((totalSec / shifts.length / 3600).toFixed(2)) : 0,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error computing shift summary", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/orgs/:org_id/shifts/:shift_id/breaks", requireRole("shift_manager"), async (req: Request, res: Response) => {
  const { org_id, shift_id } = req.params;
  const { start_time, end_time, total_seconds, type } = req.body ?? {};
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    const settings = normalizeSettings((org.config as any)?.systemSettings);
    if (!settings.allow_manual_break_edit) {
      return res.status(403).json({ error: "Manual break edits are disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { id: shift_id, orgId: org_id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const start = typeof start_time === "string" ? new Date(start_time) : new Date();
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start_time" });
    let end: Date | null = null;
    if (typeof end_time === "string" && end_time.length > 0) {
      const e = new Date(end_time);
      if (Number.isNaN(e.getTime())) return res.status(400).json({ error: "Invalid end_time" });
      end = e;
    }

    const created = await prisma.break.create({
      data: {
        shiftId: shift_id,
        startTime: start,
        endTime: end ?? null,
        totalSeconds:
          typeof total_seconds === "number" ? total_seconds : end ? Math.floor((end.getTime() - start.getTime()) / 1000) : null,
        type: typeof type === "string" ? type : null,
        editedBy: req.apiKey?.keyPrefix ?? "unknown",
        editedAt: new Date(),
      },
    });

    await logAudit({
      action: "break_create",
      entityType: "break",
      entityId: created.id,
      details: { shift_id: shift_id, type, start_time, end_time, manual: true },
      ...buildAuditContext(req),
    });

    return res.status(201).json({
      id: created.id,
      shift_id: created.shiftId,
      start_time: created.startTime.toISOString(),
      end_time: created.endTime ? created.endTime.toISOString() : null,
      total_seconds: created.totalSeconds,
      type: created.type,
      edited_by: created.editedBy,
      edited_at: created.editedAt ? created.editedAt.toISOString() : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating break", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/v2/orgs/:org_id/shifts/:shift_id/breaks/:break_id", requireRole("shift_manager"), async (req: Request, res: Response) => {
  const { org_id, shift_id, break_id } = req.params;
  const { start_time, end_time, total_seconds, type } = req.body ?? {};
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    const settings = normalizeSettings((org.config as any)?.systemSettings);
    if (!settings.allow_manual_break_edit) {
      return res.status(403).json({ error: "Manual break edits are disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { id: shift_id, orgId: org_id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const data: Prisma.BreakUpdateInput = {
      editedBy: req.apiKey?.keyPrefix ?? "unknown",
      editedAt: new Date(),
    };
    if (typeof start_time === "string") {
      const s = new Date(start_time);
      if (Number.isNaN(s.getTime())) return res.status(400).json({ error: "Invalid start_time" });
      data.startTime = s;
    }
    if (typeof end_time === "string") {
      const e = new Date(end_time);
      if (Number.isNaN(e.getTime())) return res.status(400).json({ error: "Invalid end_time" });
      data.endTime = e;
    }
    if (typeof total_seconds === "number") {
      data.totalSeconds = total_seconds;
    }
    if (typeof type === "string") {
      data.type = type;
    }

    const updated = await prisma.break.update({
      where: { id: break_id },
      data,
    });

    await logAudit({
      action: "break_update",
      entityType: "break",
      entityId: break_id,
      details: { ...data, manual: true } as Record<string, unknown>,
      ...buildAuditContext(req),
    });

    return res.json({
      id: updated.id,
      shift_id: updated.shiftId,
      start_time: updated.startTime.toISOString(),
      end_time: updated.endTime ? updated.endTime.toISOString() : null,
      total_seconds: updated.totalSeconds,
      type: updated.type,
      edited_by: updated.editedBy,
      edited_at: updated.editedAt ? updated.editedAt.toISOString() : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error updating break", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/v2/orgs/:org_id/shifts/:shift_id/breaks/:break_id", requireRole("shift_manager"), async (req: Request, res: Response) => {
  const { org_id, shift_id, break_id } = req.params;
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    const settings = normalizeSettings((org.config as any)?.systemSettings);
    if (!settings.allow_manual_break_edit) {
      return res.status(403).json({ error: "Manual break edits are disabled by policy" });
    }

    const shift = await prisma.shift.findFirst({ where: { id: shift_id, orgId: org_id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    await prisma.break.delete({ where: { id: break_id } });

    await logAudit({
      action: "break_delete",
      entityType: "break",
      entityId: break_id,
      details: { shift_id, manual: true },
      ...buildAuditContext(req),
    });

    return res.status(204).send();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error deleting break", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/orgs/:org_id/presence", requireRole("auditor"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const receiverIdParam = req.query.receiver_id;
  const fromParam = req.query.from;
  const toParam = req.query.to;
  const resultParam = req.query.result;
  const limitParam = req.query.limit;
  const userRefParam = req.query.user_ref;

  const receiverId =
    typeof receiverIdParam === "string" && receiverIdParam.length > 0
      ? receiverIdParam
      : undefined;

  const result =
    typeof resultParam === "string" && resultParam.length > 0 ? resultParam : undefined;
  const userRef =
    typeof userRefParam === "string" && userRefParam.length > 0 ? userRefParam : undefined;

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

    if (userRef) {
      where.userRef = userRef;
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

// Basic org config
router.get("/v2/orgs/:org_id/config", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const org = await prisma.org.findUnique({ where: { id: org_id } });
    if (!org) return res.status(404).json({ error: "Org not found" });
    const cfg = typeof org.config === "object" && !Array.isArray(org.config) ? (org.config as Prisma.JsonObject) : {};
    return res.json({
      id: org.id,
      name: org.name,
      timezone: (cfg as any)?.timezone ?? null,
      contactEmail: (cfg as any)?.contactEmail ?? null,
      orgType: (org as any).orgType ?? "office",
      enabledModules: (org as any).enabledModules ?? [],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching org config", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/v2/orgs/:org_id/config", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { orgType, enabledModules, timezone, contactEmail, name } = req.body ?? {};
  const data: any = {};
  if (typeof orgType === "string" && ORG_TYPES.includes(orgType)) data.orgType = orgType;
  if (Array.isArray(enabledModules) && enabledModules.every((m) => typeof m === "string" && MODULES.includes(m))) {
    data.enabledModules = enabledModules;
  }
  if (timezone || contactEmail || name) {
    const cfg: any = {};
    if (typeof timezone === "string") cfg.timezone = timezone;
    if (typeof contactEmail === "string") cfg.contactEmail = contactEmail;
    data.config = cfg;
    if (typeof name === "string" && name.trim().length > 0) data.name = name.trim();
  }
  try {
    const updated = await prisma.org.update({ where: { id: org_id }, data });
    return res.json({
      id: updated.id,
      name: updated.name,
      timezone: (data.config as any)?.timezone ?? null,
      contactEmail: (data.config as any)?.contactEmail ?? null,
      orgType: updated.orgType,
      enabledModules: updated.enabledModules,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error updating org config", err);
    if (err?.code === "P2025") return res.status(404).json({ error: "Org not found" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Locations derived from receivers
router.get("/v2/orgs/:org_id/locations", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const receivers = await prisma.receiver.findMany({ where: { orgId: org_id } });
    const grouped = receivers.reduce<Record<string, number>>((acc, r) => {
      const key = r.locationLabel ?? "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const result = Object.entries(grouped).map(([name, count], idx) => ({
      id: `${org_id}-loc-${idx}`,
      name,
      code: null,
      campusOrSite: null,
      receiverCount: count,
      status: "active",
    }));
    return res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing locations", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Users placeholder (no user table)
router.get("/v2/orgs/:org_id/users", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});

// Attendance placeholder
router.get("/v2/orgs/:org_id/attendance", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});

// Groups placeholder
router.get("/v2/orgs/:org_id/groups", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});

// Incidents placeholder
router.get("/v2/orgs/:org_id/incidents", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});

// Logs placeholder
router.get("/v2/orgs/:org_id/logs", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});

// HPS stats/config placeholder
router.get("/v2/orgs/:org_id/hps/stats", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});
router.get("/v2/orgs/:org_id/hps/config", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json({});
});

// Notification settings placeholder
router.get("/v2/orgs/:org_id/settings/notifications", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json({});
});
router.patch("/v2/orgs/:org_id/settings/notifications", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json({});
});

// API keys listing
router.get("/v2/orgs/:org_id/api-keys", requireRole("read-only"), async (req: Request, res: Response) => {
  const { org_id } = req.params;
  try {
    const keys = await prisma.apiKey.findMany({ where: { orgId: org_id } });
    return res.json(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        masked: `${k.keyPrefix}••••`,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing API keys", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Integrations placeholder
router.get("/v2/orgs/:org_id/integrations", requireRole("read-only"), async (_req: Request, res: Response) => {
  return res.json([]);
});

export { router as orgsRouter };
