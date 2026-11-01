import { MAX_BODY_FAT_PCT, MAX_WEIGHT_KG, parseMeasurement } from '../worker/measurement.ts';
import { addDays } from '../worker/week.ts';
import type { Measurement, Weight, Weights } from '../worker/weights.ts';
import { client, expectOk } from './api.ts';

export type { Measurement, Weight, Weights };

// Every weight newest first, with the server's today.
export async function loadWeights(): Promise<Weights> {
  const response = await client.api.weights.$get();
  expectOk(response, 'GET /api/weights');
  return response.json();
}

// Today's measurement; a second save of the day replaces the first.
export async function saveToday(body: Measurement): Promise<Weight> {
  const response = await client.api.weights.today.$put({ json: body });
  expectOk(response, 'PUT /api/weights/today');
  return (await response.json()).weight;
}

// The request the two fields make, or nothing while they do not hold a measurement the
// server takes: a weight, and a body fat when that field is not empty.
export function measurement(weight: string, bodyFat: string): Measurement | undefined {
  const weightKg = parseMeasurement(weight, MAX_WEIGHT_KG);
  if (weightKg === undefined) return undefined;
  if (bodyFat.trim() === '') return { weightKg };
  const bodyFatPct = parseMeasurement(bodyFat, MAX_BODY_FAT_PCT);
  return bodyFatPct === undefined ? undefined : { weightKg, bodyFatPct };
}

// The list with the saved day in it, newest first: today's row replaced, or put first.
export const withSaved = (rows: Weight[], saved: Weight): Weight[] =>
  rows.some((row) => row.date === saved.date)
    ? rows.map((row) => (row.date === saved.date ? saved : row))
    : [saved, ...rows];

export const kg = (n: number) => `${n.toFixed(1)} kg`;
export const pct = (n: number) => `${n.toFixed(1)} %`;

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

// The rows dated from `from` to `to`, inclusive.
const within = (rows: Weight[], from: string, to: string) =>
  rows.filter((row) => row.date >= from && row.date <= to);

export type WeekLines = { change: string | undefined; average: string | undefined };

// The two sentences under the number. The change is this week's average against last
// week's, both over seven days, so one odd morning does not swing it; nothing to compare,
// no sentence. The average needs more than one day to be one.
export function weekLines(rows: Weight[], today: string): WeekLines {
  const thisWeek = within(rows, addDays(today, -6), today);
  const lastWeek = within(rows, addDays(today, -13), addDays(today, -7));
  let change: string | undefined;
  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const diff = mean(thisWeek.map((r) => r.weightKg)) - mean(lastWeek.map((r) => r.weightKg));
    const size = Math.round(Math.abs(diff) * 10) / 10;
    change = size === 0 ? 'No change this week' : `${diff < 0 ? '−' : '+'}${kg(size)} this week`;
  }
  let average: string | undefined;
  if (thisWeek.length >= 2) {
    const fat = thisWeek.map((r) => r.bodyFatPct).filter((v) => v !== null);
    const weight = kg(mean(thisWeek.map((r) => r.weightKg)));
    const parts = fat.length === 0 ? weight : `${weight} and ${pct(mean(fat))} body fat`;
    average = `Averaging ${parts} over the last 7 days.`;
  }
  return { change, average };
}
