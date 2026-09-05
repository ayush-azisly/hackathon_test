/**
 * Week helpers. A "week" is ISO 8601: it starts Monday 00:00 local time.
 * Dates are handled as YYYY-MM-DD strings to avoid timezone drift.
 */

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday of the week containing the given date. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = out.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  return out;
}

export function weekEnd(d: Date): Date {
  const start = weekStart(d);
  const out = new Date(start);
  out.setDate(out.getDate() + 6);
  return out;
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDateString(s);
  return !isNaN(d.getTime()) && toDateString(d) === s;
}
