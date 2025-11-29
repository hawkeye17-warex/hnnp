import { NextFunction, Request, Response } from "express";
import { generateRequestId, log, redactBody, redactHeaders } from "../logger";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const incomingId = req.headers["x-request-id"];
  const reqId = typeof incomingId === "string" ? incomingId : generateRequestId();
  req.requestId = reqId;
  res.setHeader("X-Request-Id", reqId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const meta: Record<string, unknown> = {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: duration,
      request_id: reqId,
    };
    if (req.user?.id) meta.user_id = req.user.id;
    if (req.user?.orgId) meta.org_id = req.user.orgId;
    log({ level: "info", message: "request", meta });
  });

  return next();
}

export function logRequestBody(req: Request, res: Response, next: NextFunction) {
  const headers = redactHeaders(req.headers as any);
  const body = redactBody(req.body);
  log({
    level: "info",
    message: "incoming_request",
    meta: {
      request_id: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      headers,
      body,
      org_id: req.org?.id ?? req.headers["x-org-id"],
      user_id: req.user?.id,
    },
  });
  return next();
}
