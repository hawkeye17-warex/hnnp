import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  databaseUrl?: string;
  deviceIdSalt?: string;
  webhookSecret?: string;
}

export function loadConfig(): AppConfig {
  const portRaw = process.env.PORT ?? "3000";
  const port = Number(portRaw);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${portRaw}`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  const deviceIdSalt = process.env.DEVICE_ID_SALT;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  return {
    port,
    databaseUrl,
    deviceIdSalt,
    webhookSecret,
  };
}
