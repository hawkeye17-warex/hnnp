import http from "http";
import express, { Request, Response } from "express";
import { loadConfig } from "./config";
import { presenceRouter } from "./routes/presence";

const config = loadConfig();
const app = express();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use(presenceRouter);

const server = http.createServer(app);

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, () => {
    // Cloud backend HTTP bootstrap only; protocol endpoints from protocol/spec.md
    // (Sections 8–10: Cloud verification, link management, webhooks) will be implemented on top of this server.
    // This file does not implement any HNNP protocol logic yet.
    // eslint-disable-next-line no-console
    console.log(`HNNP backend listening on port ${config.port}`);
  });
}

export { app, server };
