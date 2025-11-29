import { Router, Request, Response } from "express";
import { log } from "../logger";

const router = Router();

router.post("/api/org/client-logs", (req: Request, res: Response) => {
  const { level = "error", message, component, stack, user_id } = req.body ?? {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  log({
    level: ["info", "warn", "error"].includes(String(level)) ? level : "error",
    message: "client_log",
    meta: {
      client_message: message,
      component,
      stack,
      user_id,
      org_id: req.org?.id ?? req.headers["x-org-id"],
    },
  });

  return res.status(204).send();
});

export { router as clientLogsRouter };
