import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/orgScope";

type SecuritySettingsResponse = {
  sessionTimeoutMinutes: number;
  passwordPolicy: string;
  mfaRequired: boolean;
};

const router = Router();

// Read-only security settings for now.
router.get("/api/settings/security", requireAuth, requireOrgAccess, async (_req: Request, res: Response) => {
  const payload: SecuritySettingsResponse = {
    sessionTimeoutMinutes: 60,
    passwordPolicy: "Minimum 12 characters, mixed case, number or symbol",
    mfaRequired: false,
  };
  // TODO: read real org-specific security settings when backend supports configuration storage.
  return res.json(payload);
});

export { router as settingsRouter };
