import crypto from "crypto";
import { encodeUint32BE } from "../services/uint";
import dotenv from "dotenv";

dotenv.config();

interface SimConfig {
  backendUrl: string;
  orgId: string;
  receiverId: string;
  receiverSecret: string;
  deviceCount: number;
}

function loadSimConfig(): SimConfig {
  const backendUrl = process.env.SIM_BACKEND_URL ?? "http://localhost:3000";
  const orgId = process.env.SIM_ORG_ID ?? process.env.RECEIVER_ORG_ID ?? "org_sim";
  const receiverId = process.env.SIM_RECEIVER_ID ?? process.env.RECEIVER_ID ?? "rcv_sim";
  const receiverSecret =
    process.env.SIM_RECEIVER_SECRET ?? process.env.RECEIVER_SECRET ?? "receiver_secret_sim";

  const deviceCountRaw = process.env.SIM_DEVICE_COUNT ?? "20";
  const deviceCount = Number(deviceCountRaw);

  if (!Number.isInteger(deviceCount) || deviceCount <= 0) {
    throw new Error(`Invalid SIM_DEVICE_COUNT value: ${deviceCountRaw}`);
  }

  return {
    backendUrl,
    orgId,
    receiverId,
    receiverSecret,
    deviceCount,
  };
}

function computeReceiverSignature(params: {
  receiverSecret: string;
  orgId: string;
  receiverId: string;
  timeSlot: number;
  tokenPrefixHex: string;
  timestamp: number;
}): string {
  const { receiverSecret, orgId, receiverId, timeSlot, tokenPrefixHex, timestamp } = params;

  const hmac = crypto.createHmac("sha256", Buffer.from(receiverSecret, "utf8"));
  hmac.update(Buffer.from(orgId, "utf8"));
  hmac.update(Buffer.from(receiverId, "utf8"));
  hmac.update(encodeUint32BE(timeSlot));
  hmac.update(Buffer.from(tokenPrefixHex, "hex"));
  hmac.update(encodeUint32BE(timestamp));

  return hmac.digest("hex");
}

async function simulatePresence(): Promise<void> {
  const cfg = loadSimConfig();

  const fetchFn: typeof fetch | undefined = (globalThis as any).fetch;
  if (!fetchFn) {
    // eslint-disable-next-line no-console
    console.error("global fetch is not available; Node 18+ is required to run the simulator.");
    process.exit(1);
  }

  let accepted = 0;
  let rejected = 0;

  // Simple model: one synthetic report per device for the current time_slot.
  for (let i = 0; i < cfg.deviceCount; i += 1) {
    const now = Math.floor(Date.now() / 1000);
    const timeSlot = Math.floor(now / 15);

    const tokenPrefix = crypto.randomBytes(16);
    const mac = crypto.randomBytes(8);

    const tokenPrefixHex = tokenPrefix.toString("hex");
    const macHex = mac.toString("hex");

    // Occasionally generate invalid signatures or skewed timestamps to exercise rejection paths.
    const shouldSkew = Math.random() < 0.1;
    const timestamp = shouldSkew ? now + 1000 : now;

    const signature = computeReceiverSignature({
      receiverSecret: cfg.receiverSecret,
      orgId: cfg.orgId,
      receiverId: cfg.receiverId,
      timeSlot,
      tokenPrefixHex,
      timestamp,
    });

    const body = {
      org_id: cfg.orgId,
      receiver_id: cfg.receiverId,
      timestamp,
      time_slot: timeSlot,
      version: 0x02,
      flags: 0,
      token_prefix: tokenPrefixHex,
      mac: macHex,
      signature,
    };

    try {
      const res = await fetchFn(`${cfg.backendUrl}/v2/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        accepted += 1;
      } else {
        rejected += 1;
        // eslint-disable-next-line no-console
        console.warn(
          "Presence simulator: request rejected",
          res.status,
          res.statusText,
        );
      }
    } catch (err) {
      rejected += 1;
      // eslint-disable-next-line no-console
      console.error("Presence simulator: network error", err);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `simulate:presence finished (devices=${cfg.deviceCount}, accepted=${accepted}, rejected=${rejected})`,
  );
}

simulatePresence().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("simulate:presence failed", err);
  process.exit(1);
});

