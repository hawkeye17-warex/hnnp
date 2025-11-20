import { Router, Request, Response } from "express";
import { presenceEvents } from "./presence";
import { getWebhookQueueSize, getWebhookDeadLetterSize } from "../services/webhooks";
import { countOpenSessions } from "../db/sessions";

const router = Router();
const startedAt = Date.now();

router.get("/v2/debug/status", async (_req: Request, res: Response) => {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - startedAt) / 1000);

  const presenceEventCount = presenceEvents.length;
  const activePresenceSessionCount = await countOpenSessions();
  const webhookQueueSize = getWebhookQueueSize();
  const webhookDeadLetterSize = getWebhookDeadLetterSize();

  res.status(200).json({
    uptime_seconds: uptimeSeconds,
    presence_event_count: presenceEventCount,
    active_presence_session_count: activePresenceSessionCount,
    webhook_queue_size: webhookQueueSize,
    webhook_dead_letter_size: webhookDeadLetterSize,
  });
});

export { router as debugRouter };
