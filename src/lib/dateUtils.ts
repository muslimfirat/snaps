/**
 * Local-time date helpers.
 *
 * `Date#toISOString()` returns a **UTC** calendar date, which drifts from the
 * user's local date near midnight (e.g. 01:00 in UTC+3 is still "yesterday" in
 * UTC). Streak tracking, daily task keys and Leitner review dates all compare
 * "today" against stored dates, so they must all use the *local* calendar date.
 */

/** Local calendar date as `YYYY-MM-DD`. */
export function getLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole calendar-day difference between two `YYYY-MM-DD` strings (0 if either is invalid). */
export function dayDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(`${dateStr1}T00:00:00`);
  const d2 = new Date(`${dateStr2}T00:00:00`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / 86_400_000);
}
