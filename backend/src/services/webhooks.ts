import crypto from "crypto";
import { logger } from "./logger";

interface WebhookPayload {
  type: string;
  [key: string]: unknown;
}

interface WebhookJob {
  orgId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
  attempt: number;
  nextRetryAt: number;
}

const queue: WebhookJob[] = [];
const deadLetter: WebhookJob[] = [];

let dispatcherStarted = false;

function getWebhookConfig(_orgId: string): { url: string; secret: string } | null {
  // For now, support a single global webhook URL + secret.
  // A real implementation would store per-org webhook_url and webhook_secret.
  const secret = process.env.WEBHOOK_SECRET;
  const url = process.env.WEBHOOK_URL;
  if (!secret || !url) {
    return null;
  }
  return { url, secret };
}

function computeSignature(secret: string, timestamp: number, rawBody: string): string {
  const msg = `${timestamp}${rawBody}`;
  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(Buffer.from(msg, "utf8"));
  return hmac.digest("hex");
}

function enqueueWebhook(orgId: string, payload: WebhookPayload): void {
  const cfg = getWebhookConfig(orgId);
  if (!cfg) {
    // Webhooks not configured; nothing to enqueue.
    return;
  }

  const job: WebhookJob = {
    orgId,
    url: cfg.url,
    secret: cfg.secret,
    payload,
    attempt: 0,
    nextRetryAt: Date.now(),
  };

  queue.push(job);
  ensureDispatcher();
}

function ensureDispatcher(): void {
  if (dispatcherStarted) {
    return;
  }
  dispatcherStarted = true;

  const intervalMs = 1000;
  setInterval(() => {
    void processQueue();
  }, intervalMs);
}

async function processQueue(): Promise<void> {
  if (queue.length === 0) {
    return;
  }

  const now = Date.now();
  const maxAttempts = Number.isFinite(Number(process.env.WEBHOOK_MAX_ATTEMPTS))
    ? Number(process.env.WEBHOOK_MAX_ATTEMPTS)
    : 5;

  const jobs = queue.slice();
  for (const job of jobs) {
    if (job.nextRetryAt > now) {
      continue;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify(job.payload);
    const signature = computeSignature(job.secret, timestamp, rawBody);

    try {
      const fetchFn: typeof fetch | undefined = (globalThis as any).fetch;
      if (!fetchFn) {
        throw new Error("fetch is not available in this runtime");
      }

      const res = await fetchFn(job.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HNNP-Timestamp": String(timestamp),
          "X-HNNP-Signature": signature,
        },
        body: rawBody,
      });

      if (res.ok) {
        removeJob(job);
        logger.info("webhook delivered", {
          org_id: job.orgId,
          type: job.payload.type,
          status: res.status,
        });
        continue;
      }

      // Non-2xx status: treat 5xx as retryable, others as dead-letter.
      if (res.status >= 500) {
        scheduleRetry(job);
      } else {
        moveToDeadLetter(job);
      }
    } catch (err) {
      // Network error: retry with backoff.
      scheduleRetry(job);
      logger.warn("webhook network error", {
        org_id: job.orgId,
        type: job.payload.type,
        attempt: job.attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (job.attempt >= maxAttempts) {
      moveToDeadLetter(job);
    }
  }
}

function removeJob(job: WebhookJob): void {
  const idx = queue.indexOf(job);
  if (idx >= 0) {
    queue.splice(idx, 1);
  }
}

function scheduleRetry(job: WebhookJob): void {
  job.attempt += 1;
  const backoffSeconds = Math.min(60, 2 ** Math.min(job.attempt, 6));
  job.nextRetryAt = Date.now() + backoffSeconds * 1000;
}

function moveToDeadLetter(job: WebhookJob): void {
  removeJob(job);
  deadLetter.push(job);
  logger.warn("webhook moved to dead-letter", {
    org_id: job.orgId,
    type: job.payload.type,
    attempts: job.attempt,
  });
}

export function getWebhookQueueSize(): number {
  return queue.length;
}

export function getWebhookDeadLetterSize(): number {
  return deadLetter.length;
}

/**
 * Queue a webhook for asynchronous dispatch with signing and retry.
 *
 * Spec (v2):
 *   X-HNNP-Timestamp: unix timestamp (string)
 *   X-HNNP-Signature: hex of HMAC-SHA256(webhook_secret, timestamp || raw_body)
 */
export async function emitWebhook(orgId: string, payload: WebhookPayload): Promise<void> {
  enqueueWebhook(orgId, payload);
}
