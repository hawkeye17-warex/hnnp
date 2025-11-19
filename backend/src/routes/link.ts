import { Router, Request, Response } from "express";
import { createLink, revokeLink } from "../services/links";
import { registerDeviceKey, getOrCreateDevice } from "../services/devices";
import { emitWebhook } from "../services/webhooks";
import { endPresenceSession, getPresenceSessionById } from "../db/sessions";

interface CreateLinkBody {
  org_id: string;
  presence_session_id: string;
  user_ref: string;
  registration_blob?: string;
}

const router = Router();

router.post("/v2/link", async (req: Request, res: Response) => {
  const body = req.body as Partial<CreateLinkBody> | undefined;

  if (!body) {
    return res.status(400).json({ error: "Missing JSON body" });
  }

  const { org_id, presence_session_id, user_ref, registration_blob } = body;

  if (
    typeof org_id !== "string" ||
    typeof presence_session_id !== "string" ||
    typeof user_ref !== "string"
  ) {
    return res.status(400).json({ error: "Invalid or missing fields in link request" });
  }

  const session = await getPresenceSessionById(presence_session_id);

  if (!session || session.orgId !== org_id || session.endedAt) {
    return res.status(404).json({ error: "presence_session_id not found" });
  }
  const deviceId = session.deviceIdHash;

  if (!deviceId) {
    return res.status(400).json({ error: "presence_session missing device context" });
  }

  // Optional registration_blob handling.
  // The full validation requires a prior onboarding flow that provides device_auth_key.
  // Here we only mark the device as registered if DEVICE_AUTH_KEY_HEX is configured
  // (useful for testing and non-production setups).
  const deviceAuthKeyHex = process.env.DEVICE_AUTH_KEY_HEX;
  if (registration_blob && deviceAuthKeyHex) {
    registerDeviceKey({
      orgId: org_id,
      deviceId: deviceId ?? "",
      deviceAuthKeyHex,
    });

    // Ensure the DeviceRecord exists; getOrCreateDevice will return existing if present.
    getOrCreateDevice({
      orgId: org_id,
      deviceIdBase: "", // not needed here; placeholder for future DB-backed implementation
      deviceId: deviceId ?? "",
    });
  }

  const link = createLink({
    orgId: org_id,
    deviceId: deviceId ?? "",
    userRef: user_ref,
  });

  // Mark session as ended/resolved in DB.
  await endPresenceSession({
    id: session.id,
    endedAt: new Date(),
  });

  await emitWebhook(org_id, {
    type: "link.created",
    link_id: link.linkId,
    device_id: link.deviceId,
    user_ref: link.userRef,
  });

  return res.status(200).json({
    status: "linked",
    link_id: link.linkId,
    user_ref: link.userRef,
    device_id: link.deviceId,
  });
});

router.delete("/v2/link/:linkId", async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const orgId = req.body?.org_id ?? req.query?.org_id;

  if (typeof orgId !== "string") {
    return res.status(400).json({ error: "org_id is required" });
  }

  const link = revokeLink({ orgId, linkId });
  if (!link) {
    return res.status(404).json({ error: "link not found" });
  }

  await emitWebhook(orgId, {
    type: "link.revoked",
    link_id: link.linkId,
  });

  return res.status(200).json({
    status: "revoked",
    link_id: link.linkId,
    revoked_at: link.revokedAt,
  });
});

export { router as linkRouter };
