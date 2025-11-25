import { NextFunction, Request, Response } from "express";

export type Capability =
  | "quiz:create"
  | "quiz:start"
  | "quiz:end"
  | "quiz:submissions";

export function requireCapability(cap: Capability) {
  return (req: Request, res: Response, next: NextFunction) => {
    const scope = (req.apiKeyScope ?? "").toLowerCase();
    if (!scope || scope.includes("superadmin")) return next();
    // simple capability string check, expecting comma-separated scopes or role markers
    if (scope.includes(cap)) return next();
    // admins can manage quizzes by default
    if (cap.startsWith("quiz:") && scope.includes("admin")) return next();
    return res.status(403).json({ error: "Insufficient capability" });
  };
}
