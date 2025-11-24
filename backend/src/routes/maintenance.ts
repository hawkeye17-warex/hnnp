import { Router, Request, Response } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { requireRole } from "../middleware/permissions";
import { getMaintenanceState, setMaintenanceState } from "../middleware/maintenance";

const router = Router();

router.get("/internal/maintenance", (req: Request, res: Response) => {
  return res.json(getMaintenanceState());
});

router.post("/internal/maintenance", apiKeyAuth, requireRole("superadmin"), (req: Request, res: Response) => {
  const { enabled, message } = req.body ?? {};
  setMaintenanceState(Boolean(enabled), typeof message === "string" ? message : undefined);
  return res.json(getMaintenanceState());
});

export { router as maintenanceRouter };
