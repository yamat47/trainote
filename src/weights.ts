import { MAX_BODY_FAT_PCT, MAX_WEIGHT_KG, parseMeasurement } from '../worker/measurement.ts';
import type { GraphProps } from '../design/src/Graph.tsx';
import type { Goal } from '../worker/profile.ts';
import { addDays, daysBetween } from '../worker/week.ts';
import type { Measurement, Weight, Weights } from '../worker/weights.ts';
import { client, expectOk } from './api.ts';
import { longDate, shortDate } from './dates.ts';
import { loadProfile } from './profile.ts';

export type { Measurement, Weight };

export type Loaded = Weights & { goal: Goal };

// Every weight newest first with the server's today, and the goal from the profile.
export async function loadWeights(): Promise<Loaded> {
  const [response, profile] = await Promise.all([client.api.weights.$get(), loadProfile()]);
  expectOk(response, 'GET /api/weights');
  const { goalWeightKg, goalDeadline } = profile;
  return { ...(await response.json()), goal: { goalWeightKg, goalDeadline } };
}

// Today's measurement; a second save of the day replaces the first.
export async function saveToday(body: Measurement): Promise<Weight> {
  const response = await client.api.weights.today.$put({ json: body });
  expectOk(response, 'PUT /api/weights/today');
  return (await response.json()).weight;
}

// The fields as the stored day fills them, "" for a value the day has not got.
export const measurementFields = (row: Weight | undefined) => ({
  weight: row === undefined ? '' : row.weightKg.toFixed(1),
  bodyFat: typeof row?.bodyFatPct === 'number' ? row.bodyFatPct.toFixed(1) : '',
});

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

export const PERIODS = [
  { key: 'w', label: 'W', days: 7, name: 'the last week' },
  { key: 'm', label: 'M', days: 30, name: 'the last month' },
  { key: '6m', label: '6M', days: 182, name: 'the last 6 months' },
  { key: 'y', label: 'Y', days: 365, name: 'the last year' },
] as const;
export type PeriodKey = (typeof PERIODS)[number]['key'];

// The graph's props for the period: the days as x from 0, the weights and body fats in
// it as points, the three dates under it, the goal line, and the sentence a screen
// reader hears. Fewer than two weights in the period: no graph.
export function graphData(
  rows: Weight[],
  today: string,
  period: PeriodKey,
  goal: number | null,
): GraphProps | undefined {
  const { days, name } = PERIODS.find((p) => p.key === period) ?? PERIODS[1];
  const to = days - 1;
  const from = addDays(today, -to);
  const [first, ...rest] = within(rows, from, today).toReversed();
  const last = rest.at(-1);
  if (first === undefined || last === undefined) return undefined;
  const inPeriod = [first, ...rest];
  const x = (date: string) => daysBetween(from, date);
  const bodyFat = inPeriod.flatMap((row) =>
    row.bodyFatPct === null ? [] : [{ x: x(row.date), y: row.bodyFatPct }],
  );
  const goalWords = goal === null ? '' : `, goal ${kg(goal)}`;
  return {
    label: `Weight over ${name}, ${kg(first.weightKg)} to ${kg(last.weightKg)}${goalWords}`,
    points: inPeriod.map((row) => ({ x: x(row.date), y: row.weightKg })),
    secondary: bodyFat.length < 2 ? undefined : bodyFat,
    to,
    xLabels: [from, addDays(from, Math.floor(to / 2)), today].map((date) => ({
      x: x(date),
      label: shortDate(date),
    })),
    goal: goal === null ? undefined : { y: goal, label: `Goal ${goal.toFixed(1)}` },
  };
}

// "Goal 60.0 kg by Mar 31, 2027. 4.2 kg to go.", under the graph. Weights and goals
// are tenths, so a real difference is at least 0.1 and prints as itself.
export function goalSentence(goal: Goal, latest: Weight): string | undefined {
  if (goal.goalWeightKg === null) return undefined;
  const by = goal.goalDeadline === null ? '' : ` by ${longDate(goal.goalDeadline)}`;
  const rest =
    latest.weightKg > goal.goalWeightKg
      ? ` ${kg(latest.weightKg - goal.goalWeightKg)} to go.`
      : ' Reached.';
  return `Goal ${kg(goal.goalWeightKg)}${by}.${rest}`;
}
