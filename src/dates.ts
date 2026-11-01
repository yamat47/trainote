import { addDays, dayInstant } from '../worker/week.ts';

// Plain dates are read as their UTC midnight (worker/week.ts), so the formatters read UTC.
const utc = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' });
const day = utc({ weekday: 'long', month: 'short', day: 'numeric' });
const dayWithYear = utc({ weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
const month = utc({ month: 'long' });
const monthWithYear = utc({ month: 'long', year: 'numeric' });
const short = utc({ month: 'short', day: 'numeric' });
const long = utc({ month: 'short', day: 'numeric', year: 'numeric' });

const sameYear = (date: string, today: string) => date.slice(0, 4) === today.slice(0, 4);

// Today, Yesterday, then "Friday, Oct 23"; the year only once it differs from today's.
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return (sameYear(date, today) ? day : dayWithYear).format(dayInstant(date));
}

// "October", then "October 2025" once the year differs from today's.
export const monthLabel = (date: string, today: string): string =>
  (sameYear(date, today) ? month : monthWithYear).format(dayInstant(date));

// "Sep 27", under a graph.
export const shortDate = (date: string): string => short.format(dayInstant(date));

// "Mar 31, 2027", a deadline.
export const longDate = (date: string): string => long.format(dayInstant(date));

// YYYY-MM of a date, what the month header groups by.
export const monthOf = (date: string) => date.slice(0, 7);
