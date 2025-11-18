import http from "http";
import express, { Request, Response } from "express";
import { loadConfig } from "./config";

const config = loadConfig();
const app = express();

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

const server = http.createServer(app);

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, () => {
    // Cloud backend HTTP bootstrap only; protocol endpoints from protocol/spec.md
    // (Section 7: Cloud API) will be implemented on top of this server.
    // This file does not implement any HNNP protocol logic yet.
    // eslint-disable-next-line no-console
    console.log(`HNNP backend listening on port ${config.port}`);
  });
}

export { app, server };
