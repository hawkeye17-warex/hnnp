import { evaluatePresenceFusion, PresenceFusionEvent } from "../services/presenceFusion";

describe("presenceFusion", () => {
  const orgId = "org_1";
  const deviceId = "dev_1";

  it("rejects quick repeats from the same receiver within the dedup window", () => {
    const events: PresenceFusionEvent[] = [
      {
        org_id: orgId,
        device_id: deviceId,
        receiver_id: "rcv_a",
        timestamp: 1000,
        time_slot: 123,
      },
    ];

    const result = evaluatePresenceFusion(
      events,
      {
        orgId,
        deviceId,
        receiverId: "rcv_a",
        timestamp: 1002,
        timeSlot: 123,
      },
      {
        duplicateSuppressSeconds: 5,
        impossibleTravelSeconds: 60,
        hardenedMode: false,
      },
    );

    expect(result.shouldReject).toBe(true);
    expect(result.rejectStatus).toBe(409);
    expect(result.rejectError).toMatch(/Duplicate presence event/);
    expect(result.suspiciousDuplicate).toBe(false);
    expect(result.suspiciousFlags).toEqual([]);
  });

  it("flags impossible movement when two receivers see the same device within 1 second", () => {
    const events: PresenceFusionEvent[] = [
      {
        org_id: orgId,
        device_id: deviceId,
        receiver_id: "rcv_a",
        timestamp: 1000,
        time_slot: 123,
      },
    ];

    const result = evaluatePresenceFusion(
      events,
      {
        orgId,
        deviceId,
        receiverId: "rcv_b",
        timestamp: 1001,
        timeSlot: 123,
      },
      {
        duplicateSuppressSeconds: 5,
        impossibleTravelSeconds: 60,
        hardenedMode: false,
      },
    );

    expect(result.shouldReject).toBe(false);
    expect(result.suspiciousDuplicate).toBe(false);
    expect(result.suspiciousFlags).toContain("impossible_movement");
  });

  it("allows movement between receivers when time gap exceeds impossibleTravelSeconds", () => {
    const events: PresenceFusionEvent[] = [
      {
        org_id: orgId,
        device_id: deviceId,
        receiver_id: "rcv_a",
        timestamp: 1000,
        time_slot: 123,
      },
    ];

    const result = evaluatePresenceFusion(
      events,
      {
        orgId,
        deviceId,
        receiverId: "rcv_b",
        timestamp: 1000 + 120, // larger than impossibleTravelSeconds
        timeSlot: 123,
      },
      {
        duplicateSuppressSeconds: 5,
        impossibleTravelSeconds: 60,
        hardenedMode: false,
      },
    );

    expect(result.shouldReject).toBe(false);
    expect(result.suspiciousDuplicate).toBe(false);
    expect(result.suspiciousFlags).not.toContain("impossible_movement");
  });
});

