import { Router, Request, Response } from "express";
import { Prisma, QuizSession } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/permissions";
import { logAudit, buildAuditContext } from "../services/audit";
import { checkQuizPresence } from "../services/quizPresence";
import { requireAuth } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/orgScope";

const router = Router();

router.use(requireAuth, requireOrgAccess);

function serializeQuiz(quiz: QuizSession) {
  return {
    id: quiz.id,
    org_id: quiz.orgId,
    course_id: quiz.courseId,
    receiver_id: quiz.receiverId,
    title: quiz.title,
    start_time: quiz.startTime.toISOString(),
    end_time: quiz.endTime.toISOString(),
    status: quiz.status,
    created_by: quiz.createdBy,
    settings_json: quiz.settingsJson,
    test_mode: quiz.testMode,
    created_at: quiz.createdAt.toISOString(),
  };
}

router.get("/v2/quiz/list", requireRole("read-only"), async (req: Request, res: Response) => {
  const org = req.org;
  if (!org) return res.status(404).json({ error: "Org not found" });
  const statusParam = req.query.status;
  const where: Prisma.QuizSessionWhereInput = { orgId: org.id };
  if (typeof statusParam === "string" && statusParam.length > 0) where.status = statusParam;
  try {
    const quizzes = await prisma.quizSession.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: 200,
    });
    return res.json(quizzes.map(serializeQuiz));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing quizzes", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v2/quiz/:id", requireRole("read-only"), async (req: Request, res: Response) => {
  const org = req.org;
  if (!org) return res.status(404).json({ error: "Org not found" });
  const { id } = req.params;
  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id, orgId: org.id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    return res.json(serializeQuiz(quiz));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error fetching quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v2/quiz/submit", requireRole("read-only"), async (req: Request, res: Response) => {
  const org = req.org;
  if (!org) return res.status(404).json({ error: "Org not found" });
  const { quiz_id, profile_id, user_ref } = req.body ?? {};

  if (typeof quiz_id !== "string" || quiz_id.trim().length === 0) {
    return res.status(400).json({ error: "quiz_id is required" });
  }

  try {
    const quiz = await prisma.quizSession.findFirst({ where: { id: quiz_id, orgId: org.id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const settings = (quiz.settingsJson ?? {}) as any;
    const requirePresence = Boolean(settings.require_presence);
    const presenceWindowMinutes = typeof settings.presence_window_minutes === "number" ? settings.presence_window_minutes : 10;
    const lateJoinAllowed = Boolean(settings.late_join_allowed);

    const now = new Date();
    if (!lateJoinAllowed && quiz.startTime > now) {
      return res.status(400).json({ error: "Quiz not started yet" });
    }
    if (quiz.endTime < now) {
      return res.status(400).json({ error: "Quiz closed" });
    }

    if (requirePresence) {
      const presence = await checkQuizPresence({
        orgId: org.id,
        profileId: typeof profile_id === "string" ? profile_id : undefined,
        userRef: typeof user_ref === "string" && user_ref.length > 0 ? user_ref : undefined,
        receiverId: quiz.receiverId ?? undefined,
        windowMinutes: presenceWindowMinutes,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
      });
      if (!presence.ok) {
        return res.status(403).json({ error: presence.reason });
      }
    }

    await logAudit({
      action: "quiz_submit",
      entityType: "quiz",
      entityId: quiz_id,
      details: { profile_id, user_ref },
      ...buildAuditContext(req),
    });

    return res.json({ ok: true, quiz: serializeQuiz(quiz) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error submitting quiz", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as quizRouter };
