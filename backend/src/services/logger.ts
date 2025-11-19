export type LogLevel = "debug" | "info" | "warn" | "error";

// Keys/field names that must NEVER be logged.
const FORBIDDEN_KEYS = [
  "device_secret",
  "deviceSecret",
  "device_auth_key",
  "deviceAuthKey",
  "receiver_secret",
  "receiverSecret",
  "device_id_salt",
  "deviceIdSalt",
  "webhook_secret",
  "webhookSecret",
];

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (FORBIDDEN_KEYS.some((k) => lower === k.toLowerCase())) {
    return true;
  }
  // Any generic "*secret*" key is treated as sensitive.
  if (lower.includes("secret")) {
    return true;
  }
  return false;
}

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (isForbiddenKey(key)) {
      safe[key] = "[REDACTED]";
      continue;
    }

    if (typeof value === "string") {
      const lowerKey = key.toLowerCase();

      // Never log full MACs: if the field looks like a MAC/signature, redact.
      if ((lowerKey.includes("mac") || lowerKey.includes("signature")) && value.length > 16) {
        safe[key] = "[REDACTED]";
        continue;
      }
    }

    safe[key] = value;
  }

  return safe;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const safeContext = context ? sanitizeContext(context) : undefined;
  const line =
    safeContext && Object.keys(safeContext).length > 0
      ? `${message} ${JSON.stringify(safeContext)}`
      : message;

  switch (level) {
    case "debug":
      // eslint-disable-next-line no-console
      console.debug(line);
      break;
    case "info":
      // eslint-disable-next-line no-console
      console.info(line);
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(line);
      break;
    case "error":
      // eslint-disable-next-line no-console
      console.error(line);
      break;
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};

