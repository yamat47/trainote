import { describe, expect, it } from 'vitest';
import { tokyoDate, tokyoWeek } from './week.ts';

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
