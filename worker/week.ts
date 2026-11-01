// Dates are Asia/Tokyo by decision, and a week runs Monday to Sunday.

const TOKYO = 'Asia/Tokyo';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TOKYO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormat = new Intl.DateTimeFormat('en-US', { timeZone: TOKYO, weekday: 'short' });

// The week's days in the order the strip and the counts use.
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const MONDAY_FIRST: Record<string, number> = Object.fromEntries(WEEKDAYS.map((day, i) => [day, i]));

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

// A calendar day plus n days, as YYYY-MM-DD. Days here are plain dates, so the arithmetic
// runs in UTC where no zone can shift it.
export function addDays(date: string, n: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + n);
  return instant.toISOString().slice(0, 10);
}

// The seven dates of the Tokyo week the instant falls in, Monday first.
export const weekDates = (instant: Date): string[] =>
  WEEKDAYS.map((_, i) => addDays(tokyoWeek(instant).from, i));

// Days in a row with at least one entry, counted back from today, or from yesterday when
// today has none yet: a day that is not over does not break the run.
export function streak(dates: Iterable<string>, today: string): number {
  const written = new Set(dates);
  let day = written.has(today) ? today : addDays(today, -1);
  let days = 0;
  while (written.has(day)) {
    days += 1;
    day = addDays(day, -1);
  }
  return days;
}
