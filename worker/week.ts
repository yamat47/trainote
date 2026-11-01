// Dates are Asia/Tokyo by decision, and a week runs Monday to Sunday.

const TOKYO = 'Asia/Tokyo';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TOKYO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormat = new Intl.DateTimeFormat('en-US', { timeZone: TOKYO, weekday: 'short' });

const MONDAY_FIRST: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

// YYYY-MM-DD of the instant in Tokyo, the form entries.date and weights.date use.
export function tokyoDate(instant: Date): string {
  return dayFormat.format(instant);
}

// The Monday-to-today range of the Tokyo week the instant falls in, as two dates.
export function tokyoWeek(instant: Date): { from: string; to: string } {
  const to = tokyoDate(instant);
  const sinceMonday = MONDAY_FIRST[weekdayFormat.format(instant)];
  if (sinceMonday === undefined) throw new Error(`unexpected weekday for ${instant.toISOString()}`);
  const monday = new Date(instant.getTime() - sinceMonday * 24 * 60 * 60 * 1000);
  return { from: tokyoDate(monday), to };
}
