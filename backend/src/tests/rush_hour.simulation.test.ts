import request from "supertest";
import crypto from "crypto";
import { app } from "../index";
import { encodeUint32BE } from "../services/uint";
import { presenceEvents, presenceSessions } from "../routes/presence";

const ORG_ID = "org_rush_hour";
const RECEIVER_ID = "receiver_rush_hour";
const RECEIVER_SECRET = "receiver_secret_rush_hour";
const DEVICE_ID_SALT = "device_id_salt_rush_hour";

function computeSignature(params: {
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

function deriveTokenPrefixHex(deviceIndex: number, timeSlot: number): string {
  const h = crypto.createHash("sha256");
  h.update(`device-${deviceIndex}-slot-${timeSlot}`);
  return h.digest().subarray(0, 16).toString("hex");
}

function deriveMacHex(deviceIndex: number, timeSlot: number): string {
  const h = crypto.createHash("sha256");
  h.update(`mac-${deviceIndex}-slot-${timeSlot}`);
  return h.digest().subarray(0, 8).toString("hex");
}

async function runScenario(numDevices: number) {
  presenceEvents.length = 0;
  presenceSessions.length = 0;

  const serverTime = Math.floor(Date.now() / 1000);
  const timeSlot = Math.floor(serverTime / 15);

  const beforeCpu = process.cpuUsage();
  const beforeMem = process.memoryUsage().rss;
  const start = process.hrtime.bigint();

  const requests: Array<Promise<request.Response>> = [];

  for (let i = 0; i < numDevices; i += 1) {
    const tokenPrefixHex = deriveTokenPrefixHex(i, timeSlot);
    const macHex = deriveMacHex(i, timeSlot);

    const signature = computeSignature({
      receiverSecret: RECEIVER_SECRET,
      orgId: ORG_ID,
      receiverId: RECEIVER_ID,
      timeSlot,
      tokenPrefixHex,
      timestamp: serverTime,
    });

    const body = {
      org_id: ORG_ID,
      receiver_id: RECEIVER_ID,
      timestamp: serverTime,
      time_slot: timeSlot,
      version: 0x02,
      flags: 0,
      token_prefix: tokenPrefixHex,
      mac: macHex,
      signature,
    };

    requests.push(request(app).post("/v2/presence").send(body));
  }

  const responses = await Promise.all(requests);

  const end = process.hrtime.bigint();
  const cpuDelta = process.cpuUsage(beforeCpu);
  const afterMem = process.memoryUsage().rss;

  const durationSec = Number(end - start) / 1e9;
  const throughput = numDevices / durationSec;
  const cpuMs = (cpuDelta.user + cpuDelta.system) / 1000;
  const memDeltaMb = (afterMem - beforeMem) / (1024 * 1024);

  const statuses = responses.map((r) => r.status);
  const non200 = statuses.filter((s) => s !== 200);

  const uniqueDevices = new Set(presenceEvents.map((e) => e.device_id)).size;
  const eventsStored = presenceEvents.length;
  const sessionsStored = presenceSessions.length;

  // Basic correctness checks: all requests accepted and one event per device.
  expect(non200).toHaveLength(0);
  expect(eventsStored).toBeLessThanOrEqual(numDevices * 50);
  expect(uniqueDevices).toBe(numDevices);
  expect(sessionsStored).toBe(numDevices);

  // Log metrics for human inspection of stability/throughput.
  // These logs are informational; tests only assert correctness, not performance thresholds.
  // eslint-disable-next-line no-console
  console.log(
    `[rush-hour] devices=${numDevices} duration=${durationSec.toFixed(
      3,
    )}s throughput=${throughput.toFixed(1)} events/s cpu=${cpuMs.toFixed(
      1,
    )}ms memDelta=${memDeltaMb.toFixed(2)}MB uniqueDevices=${uniqueDevices}`,
  );
}

// Heavy load simulation is opt-in to avoid slowing down normal test runs.
const maybeIt = process.env.RUN_RUSH_HOUR_SIM === "true" ? it : it.skip;

describe("rush-hour load simulation (device → receiver → cloud)", () => {
  beforeAll(() => {
    jest.setTimeout(60000);
    process.env.RECEIVER_ORG_ID = ORG_ID;
    process.env.RECEIVER_ID = RECEIVER_ID;
    process.env.RECEIVER_SECRET = RECEIVER_SECRET;
    process.env.DEVICE_ID_SALT = DEVICE_ID_SALT;
    process.env.MAX_SKEW_SECONDS = "300";
    process.env.MAX_DRIFT_SLOTS = "1";
  });

  maybeIt("simulates N devices in a 15s window at increasing load", async () => {
    const deviceCounts = [50, 200, 400, 800, 1000];

    for (const count of deviceCounts) {
      // eslint-disable-next-line no-await-in-loop
      await runScenario(count);
    }
  });
});
