import express, { Request, Response } from "express";
import { verifyHnnpWebhook } from "@hnnp/sdk";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const PORT = Number(process.env.PORT ?? 3000);

// Extend Request type locally to hold the captured raw body.
interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

const app = express();

// Capture raw body for signature verification while still parsing JSON.
app.use(
  express.json({
    verify: (req: WebhookRequest, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  }),
);

app.post("/hnnp/webhook", (req: WebhookRequest, res: Response) => {
  if (!WEBHOOK_SECRET) {
    // In production you would usually fail fast at startup instead.
    console.error("WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "server_not_configured" });
  }

  const signature = req.header("X-HNNP-Signature") ?? "";
  const timestamp = req.header("X-HNNP-Timestamp") ?? "";
  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body), "utf8");

  const isValid = verifyHnnpWebhook({
    rawBody,
    signature,
    timestamp,
    webhookSecret: WEBHOOK_SECRET,
  });

  if (!isValid) {
    console.warn("Received invalid HNNP webhook", {
      path: req.path,
      timestamp,
    });
    return res.status(400).json({ error: "invalid_webhook_signature" });
  }

  // At this point, req.body is a trusted HNNP webhook payload.
  // Handle presence.check_in, presence.unknown, link.created, link.revoked, etc.
  console.log("Received HNNP webhook", req.body);

  return res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HNNP webhook consumer listening on http://localhost:${PORT}`);
});

