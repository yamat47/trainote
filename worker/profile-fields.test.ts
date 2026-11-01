import { describe, expect, it } from 'vitest';
import { parseHeight, parseText, parseWhole, thisYear } from './profile-fields.ts';

describe('parseHeight', () => {
  it('reads centimetres with one decimal at most, from 50 to under 250', () => {
    expect(parseHeight(' 172 ')).toBe(172);
    expect(parseHeight('172.5')).toBe(172.5);
    expect(parseHeight('50')).toBe(50);
    expect(['49.9', '250', '172.25', '1.7e2', 'abc'].map(parseHeight)).toEqual(
      Array.from({ length: 5 }, () => undefined),
    );
  });

  it('reads an empty field as a cleared height', () => {
    expect(parseHeight('  ')).toBeNull();
  });
});

describe('parseWhole', () => {
  it('reads a whole number within both bounds', () => {
    expect(parseWhole('0', 0, 14)).toBe(0);
    expect(parseWhole('14', 0, 14)).toBe(14);
    expect(['15', '-1', '2.5', '3 days'].map((text) => parseWhole(text, 0, 14))).toEqual(
      Array.from({ length: 4 }, () => undefined),
    );
    expect(parseWhole('', 0, 14)).toBeNull();
  });
});

describe('parseText', () => {
  it('keeps the words without the spaces around them, up to the ceiling', () => {
    expect(parseText('  Home gym ', 50)).toBe('Home gym');
    expect(parseText('x'.repeat(51), 50)).toBeUndefined();
    expect(parseText(' \n ', 50)).toBeNull();
  });
});

describe('thisYear', () => {
  it('is the year in Tokyo, which turns nine hours before UTC', () => {
    expect(thisYear(new Date('2026-12-31T15:00:00Z'))).toBe(2027);
    expect(thisYear(new Date('2026-12-31T14:59:59Z'))).toBe(2026);
  });
});
