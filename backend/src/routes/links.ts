import { Router, Request, Response } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import {
  createLink,
  activateLink,
  revokeLink,
  listLinks,
} from "../services/links";

const router = Router();

router.use(apiKeyAuth);

router.post("/v1/links", async (req: Request, res: Response) => {
  const { orgId, userRef, deviceId } = req.body ?? {};

  if (typeof orgId !== "string" || typeof userRef !== "string") {
    return res.status(400).json({ error: "orgId and userRef are required" });
  }

  try {
    const link = await createLink({
      orgId,
      deviceId: typeof deviceId === "string" ? deviceId : "",
      userRef,
    });

    return res.status(201).json({
      status: "created",
      link,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creating link", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v1/links/:id/activate", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const link = await activateLink(id);
    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    return res.status(200).json({ status: "active", link });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error activating link", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/v1/links/:id/revoke", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const link = await revokeLink({ orgId: req.org?.id, linkId: id });
    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    return res.status(200).json({ status: "revoked", link });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error revoking link", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v1/links", async (req: Request, res: Response) => {
  const orgId = req.query.orgId;
  const userRef = req.query.userRef;

  if (typeof orgId !== "string") {
    return res.status(400).json({ error: "orgId is required" });
  }

  try {
    const links = await listLinks({
      orgId,
      userRef: typeof userRef === "string" ? userRef : undefined,
    });

    return res.status(200).json({ status: "ok", links });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error listing links", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as linksRouter };
