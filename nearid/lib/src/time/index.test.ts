import { computeTimeSlot, getUnixTime, isTimeSlotWithinDrift } from ".";

describe("lib/time computeTimeSlot", () => {
  it("computes time_slot = floor(unix_time / 15)", () => {
    expect(computeTimeSlot(0)).toBe(0);
    expect(computeTimeSlot(14.9)).toBe(0);
    expect(computeTimeSlot(15)).toBe(1);
    expect(computeTimeSlot(29.999)).toBe(1);
    expect(computeTimeSlot(30)).toBe(2);
  });
});

describe("lib/time isTimeSlotWithinDrift", () => {
  it("accepts same slot", () => {
    expect(isTimeSlotWithinDrift(10, 10)).toBe(true);
  });

  it("accepts within ±maxDriftSlots", () => {
    expect(isTimeSlotWithinDrift(9, 10, 1)).toBe(true);
    expect(isTimeSlotWithinDrift(11, 10, 1)).toBe(true);
    expect(isTimeSlotWithinDrift(8, 10, 2)).toBe(true);
  });

  it("rejects outside drift", () => {
    expect(isTimeSlotWithinDrift(8, 10, 1)).toBe(false);
    expect(isTimeSlotWithinDrift(12, 10, 1)).toBe(false);
  });
});

describe("lib/time getUnixTime", () => {
  it("returns seconds since epoch (monotonic-ish)", () => {
    const t1 = getUnixTime();
    const t2 = getUnixTime();
    expect(t2 === t1 || t2 >= t1).toBe(true);
  });
});

