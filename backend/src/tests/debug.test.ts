import request from "supertest";
import { app } from "../index";
import { presenceEvents, presenceSessions } from "../routes/presence";
import { getWebhookQueueSize, getWebhookDeadLetterSize } from "../services/webhooks";

describe("GET /v2/debug/status", () => {
  beforeEach(() => {
    // Reset presenceEvents and presenceSessions to a known state.
    presenceEvents.length = 0;
    presenceSessions.length = 0;
  });

  it("returns debug status with expected fields and numeric values", async () => {
    const res = await request(app).get("/v2/debug/status");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("uptime_seconds");
    expect(typeof res.body.uptime_seconds).toBe("number");

    expect(res.body).toHaveProperty("presence_event_count", presenceEvents.length);
    const activeSessions = presenceSessions.filter((s) => !s.resolved_at).length;
    expect(res.body).toHaveProperty("active_presence_session_count", activeSessions);

    expect(res.body).toHaveProperty("webhook_queue_size", getWebhookQueueSize());
    expect(res.body).toHaveProperty(
      "webhook_dead_letter_size",
      getWebhookDeadLetterSize(),
    );
  });
});

