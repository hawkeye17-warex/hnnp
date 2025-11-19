import crypto from "crypto";

interface WebhookPayload {
  type: string;
  [key: string]: unknown;
}

function getWebhookSecret(orgId: string): string | null {
  // For now, a single global WEBHOOK_SECRET is supported.
  // A real implementation would store per-org secrets as described in the spec.
  const secret = process.env.WEBHOOK_SECRET;
  return secret ?? null;
}

function computeSignature(secret: string, timestamp: number, rawBody: string): string {
  const msg = `${timestamp}${rawBody}`;
  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "utf8"));
  hmac.update(Buffer.from(msg, "utf8"));
  return hmac.digest("hex");
}

/**
 * emitWebhook is a stub webhook emitter that computes the HMAC signature as per spec
 * but currently logs the event instead of sending an HTTP request.
 *
 * Spec (v2):
 *   X-HNNP-Timestamp: unix timestamp (string)
 *   X-HNNP-Signature: hex of HMAC-SHA256(webhook_secret, timestamp || raw_body)
 */
export async function emitWebhook(orgId: string, payload: WebhookPayload): Promise<void> {
  const secret = getWebhookSecret(orgId);
  if (!secret) {
    // Webhooks not configured; nothing to do.
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify(payload);
  const signature = computeSignature(secret, timestamp, rawBody);

  // In a real implementation, this would POST to the org's configured webhook URL.
  // For now, we log a minimal, non-sensitive summary to avoid discarding information.
  // Do NOT log secrets or full payloads containing sensitive data.
  // eslint-disable-next-line no-console
  console.log(
    "[webhook] org_id=%s type=%s ts=%s sig=%s",
    orgId,
    payload.type,
    timestamp,
    signature.substring(0, 8), // log only prefix of signature
  );
}

