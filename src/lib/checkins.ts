export interface CheckinSchedule {
  frequency: string;
  interval_days: number | null;
  anchor_date: string | null;
  last_sent_at: string | null;
  enabled: boolean;
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) };
}

function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return null;
  return ms / 86_400_000;
}

/** True when a check-in email should go out now (9:00–9:59 local, schedule matches, not already sent today). */
export function isCheckinDue(s: CheckinSchedule, timeZone: string, now: Date): boolean {
  if (!s.enabled || !Number.isFinite(now.getTime())) return false;
  try {
    const today = localParts(now, timeZone);
    if (today.hour !== 9) return false;
    if (s.last_sent_at) {
      const sent = new Date(s.last_sent_at);
      if (!Number.isFinite(sent.getTime()) || localParts(sent, timeZone).day === today.day) return false;
    }
    const day = calendarDay(today.day);
    if (day === null) return false;
    if (s.frequency === "weekly") return new Date(day * 86_400_000).getUTCDay() === 1;
    if (s.frequency === "monthly") return today.day.endsWith("-01");
    const n = s.interval_days;
    if (s.frequency !== "custom" || n === null || !Number.isInteger(n) || n < 1 || n > 365 || !s.anchor_date) return false;
    const anchor = calendarDay(s.anchor_date);
    if (anchor === null) return false;
    const elapsed = day - anchor;
    return elapsed > 0 && elapsed % n === 0;
  } catch {
    return false;
  }
}
