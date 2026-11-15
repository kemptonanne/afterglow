import { describe, expect, it } from "vitest";
import { isCheckinDue, type CheckinSchedule } from "./checkins";

const weekly: CheckinSchedule = { enabled: true, frequency: "weekly", interval_days: null, anchor_date: null, last_sent_at: null };
const due = (now: string, s: Partial<CheckinSchedule> = {}, zone = "America/New_York") =>
  isCheckinDue({ ...weekly, ...s }, zone, new Date(now));

describe("isCheckinDue", () => {
  it("weekly is due Monday during the local 9am hour", () => {
    expect(due("2026-11-16T14:00:00Z")).toBe(true);
    expect(due("2026-11-16T14:59:59Z")).toBe(true);
  });
  it("not due at 10am or another weekday", () => {
    expect(due("2026-11-16T15:00:00Z")).toBe(false);
    expect(due("2026-11-17T14:00:00Z")).toBe(false);
  });
  it("monthly only on the 1st", () => {
    expect(due("2026-12-01T14:00:00Z", { frequency: "monthly" })).toBe(true);
    expect(due("2026-12-02T14:00:00Z", { frequency: "monthly" })).toBe(false);
  });
  it("custom every N days from the anchor, not on the anchor day", () => {
    const s = { frequency: "custom", interval_days: 3, anchor_date: "2026-11-13" };
    expect(due("2026-11-16T14:00:00Z", s)).toBe(true);
    expect(due("2026-11-17T14:00:00Z", s)).toBe(false);
    expect(due("2026-11-13T14:00:00Z", s)).toBe(false);
  });
  it("skips when already sent today locally", () => {
    expect(due("2026-11-16T14:30:00Z", { last_sent_at: "2026-11-16T14:01:00Z" })).toBe(false);
  });
  it("never when disabled", () => {
    expect(due("2026-11-16T14:00:00Z", { enabled: false })).toBe(false);
  });
});
