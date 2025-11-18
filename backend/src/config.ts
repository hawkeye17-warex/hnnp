import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  databaseUrl: string | undefined;
}

export function loadConfig(): AppConfig {
  const portRaw = process.env.PORT ?? "3000";
  const port = Number(portRaw);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${portRaw}`);
  }

  const databaseUrl = process.env.DATABASE_URL;

  return {
    port,
    databaseUrl,
  };
}

