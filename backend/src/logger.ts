import crypto from "crypto";

const REDACT_HEADERS = ["authorization", "x-hnnp-api-key", "x-api-key"];
const REDACT_KEYS = ["token", "apiKey", "api_key", "signature", "password"];

export type LogEntry = {
  level: "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
};

export function redactHeaders(headers: Record<string, any>) {
  const clone: Record<string, any> = {};
  Object.entries(headers || {}).forEach(([k, v]) => {
    if (REDACT_HEADERS.includes(k.toLowerCase())) {
      clone[k] = "[REDACTED]";
    } else {
      clone[k] = v;
    }
  });
  return clone;
}

export function redactBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const clone: Record<string, any> = Array.isArray(body) ? [...body] : {...body};
  Object.keys(clone).forEach((key) => {
    if (REDACT_KEYS.includes(key.toLowerCase())) {
      clone[key] = "[REDACTED]";
    }
  });
  return clone;
}

export function generateRequestId() {
  return crypto.randomUUID();
}

export function log(entry: LogEntry) {
  const payload = {
    ts: new Date().toISOString(),
    level: entry.level,
    message: entry.message,
    ...(entry.meta ? { meta: entry.meta } : {}),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}
