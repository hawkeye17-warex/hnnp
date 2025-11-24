import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

function ensureAdminScope(req: Request, res: Response, next: NextFunction) {
  const scope = req.apiKeyScope ?? "";
  if (!scope.toLowerCase().includes("admin")) {
    return res.status(403).json({ error: "Admin scope required" });
  }
  return next();
}

router.use(apiKeyAuth, ensureAdminScope);

router.get("/internal/admin-users", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        created_at: u.createdAt.toISOString(),
        updated_at: u.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing admin users", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/internal/admin-users", async (req: Request, res: Response) => {
  const { email, name, role, status } = req.body ?? {};
  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ error: "email is required" });
  }

  try {
    const created = await prisma.adminUser.create({
      data: {
        email: email.trim().toLowerCase(),
        name: typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined,
        role: typeof role === "string" && role.trim().length > 0 ? role.trim() : "admin",
        status: typeof status === "string" && status.trim().length > 0 ? status.trim() : "active",
      },
    });
    return res.status(201).json({
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      status: created.status,
      created_at: created.createdAt.toISOString(),
      updated_at: created.updatedAt.toISOString(),
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error creating admin user", err);
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/internal/admin-users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, name, role, status } = req.body ?? {};

  const data: Record<string, unknown> = {};
  if (typeof email === "string" && email.trim().length > 0) data.email = email.trim().toLowerCase();
  if (typeof name === "string") data.name = name.trim();
  if (typeof role === "string" && role.trim().length > 0) data.role = role.trim();
  if (typeof status === "string" && status.trim().length > 0) data.status = status.trim();

  try {
    const updated = await prisma.adminUser.update({
      where: { id },
      data,
    });
    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error updating admin user", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Admin user not found" });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/internal/admin-users/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.adminUser.delete({ where: { id } });
    return res.status(204).send();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Error deleting admin user", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Admin user not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as adminUsersRouter };
