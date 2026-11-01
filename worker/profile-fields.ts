import { parseMeasurement } from './measurement.ts';
import { MAX_NOTE_LENGTH } from './note.ts';
import { tokyoDate } from './week.ts';

// The bounds of the profile's fields beyond the goal. The routes' schemas and the page's
// fields read the same numbers, so Save is offered only for what the server takes.

// A height as a tape shows it: one decimal at most, from 50 cm up to under 250 cm.
export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 250;
export const MIN_BIRTH_YEAR = 1900;
// Twice a day, every day, is past any plan the coach would read.
export const MAX_WEEKLY_SESSIONS = 14;
// A word or two (sex, where they train), a list of equipment, and the notes for the coach,
// which are as long as a note.
export const MAX_SHORT_TEXT_LENGTH = 50;
export const MAX_EQUIPMENT_LENGTH = 200;
export const MAX_COACH_NOTES_LENGTH = MAX_NOTE_LENGTH;

// The year in Tokyo, the latest a birth year can be.
export const thisYear = (now: Date) => Number(tokyoDate(now).slice(0, 4));

// What a field of the page sends: null for an empty field, which clears the value, the
// value itself, or undefined while the field holds something the server would refuse.
export type Parsed<T> = T | null | undefined;

export function parseHeight(text: string): Parsed<number> {
  if (text.trim() === '') return null;
  const n = parseMeasurement(text, MAX_HEIGHT_CM);
  return n !== undefined && n >= MIN_HEIGHT_CM ? n : undefined;
}

const WHOLE = /^\d{1,4}$/;

// A whole number from `min` to `max`, both included.
export function parseWhole(text: string, min: number, max: number): Parsed<number> {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!WHOLE.test(trimmed)) return undefined;
  const n = Number(trimmed);
  return n >= min && n <= max ? n : undefined;
}

// Text as the person wrote it, without the spaces around it.
export function parseText(text: string, max: number): Parsed<string> {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return trimmed.length <= max ? trimmed : undefined;
}
