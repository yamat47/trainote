import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, streak, tokyoDate, tokyoWeek, weekDates } from './week.ts';

describe('tokyoDate', () => {
  it('is the next day once Tokyo passes midnight, while UTC is still the evening before', () => {
    expect(tokyoDate(new Date('2026-11-01T14:59:00Z'))).toBe('2026-11-01');
    expect(tokyoDate(new Date('2026-11-01T15:00:00Z'))).toBe('2026-11-02');
  });
});

describe('tokyoWeek', () => {
  it('runs from Monday to the day itself', () => {
    // Thursday 2026-11-05 in Tokyo.
    expect(tokyoWeek(new Date('2026-11-05T03:00:00Z'))).toEqual({
      from: '2026-11-02',
      to: '2026-11-05',
    });
  });

  it('counts a Sunday evening in Tokyo with the week that is ending', () => {
    // The cron fires at 11:00 UTC, 20:00 in Tokyo, on Sunday 2026-11-08.
    expect(tokyoWeek(new Date('2026-11-08T11:00:00Z'))).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
  });

  it('starts a new week at Tokyo midnight on Monday, not at UTC midnight', () => {
    // 2026-11-08T15:30Z is Sunday in UTC and 00:30 on Monday 2026-11-09 in Tokyo.
    expect(tokyoWeek(new Date('2026-11-08T15:30:00Z'))).toEqual({
      from: '2026-11-09',
      to: '2026-11-09',
    });
  });
});

describe('addDays', () => {
  it('crosses a month and a year as calendar days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-11-05', 0)).toBe('2026-11-05');
  });
});

describe('daysBetween', () => {
  it('counts calendar days, across a month and a year', () => {
    expect(daysBetween('2026-10-03', '2026-11-01')).toBe(29);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-11-01', '2026-11-01')).toBe(0);
  });
});

describe('weekDates', () => {
  it('lists Monday to Sunday of the Tokyo week', () => {
    // Thursday 2026-11-05 in Tokyo.
    expect(weekDates(new Date('2026-11-05T03:00:00Z'))).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });
});

describe('streak', () => {
  it('counts the days in a row up to today', () => {
    expect(streak(['2026-11-03', '2026-11-04', '2026-11-05'], '2026-11-05')).toBe(3);
  });

  it('keeps the run when today has nothing yet', () => {
    expect(streak(['2026-11-03', '2026-11-04'], '2026-11-05')).toBe(2);
  });

  it('breaks at a day with nothing before yesterday', () => {
    expect(streak(['2026-11-01', '2026-11-03', '2026-11-04'], '2026-11-05')).toBe(2);
    expect(streak(['2026-11-01', '2026-11-02'], '2026-11-05')).toBe(0);
  });

  it('is zero without any entry', () => {
    expect(streak([], '2026-11-05')).toBe(0);
  });
});
