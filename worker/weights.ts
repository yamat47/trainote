import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from './app.ts';
import { jsonBody } from './body.ts';
import { database, type Database } from './db/index.ts';
import { NOW, weights } from './db/schema.ts';
import { MAX_BODY_FAT_PCT, MAX_WEIGHT_KG } from './measurement.ts';
import { tokyoDate, type DayRange } from './week.ts';

// A weight in kg as a scale shows it; the goal is one too.
export const WeightKg = z.number().gt(0).lt(MAX_WEIGHT_KG).multipleOf(0.1);

export const Measurement = z.object({
  weightKg: WeightKg,
  bodyFatPct: z.number().gt(0).lt(MAX_BODY_FAT_PCT).multipleOf(0.1).optional(),
});
export type Measurement = z.infer<typeof Measurement>;

const measurementBody = jsonBody(Measurement, 'Body must carry a weight in kg');

// What the page reads of a row; the ids and timestamps stay in the database.
const shown = { date: weights.date, weightKg: weights.weightKg, bodyFatPct: weights.bodyFatPct };

export type Weight = Pick<typeof weights.$inferSelect, 'date' | 'weightKg' | 'bodyFatPct'>;
export type Weights = { today: string; weights: Weight[] };

// One row per day, so today's entry is a put: entering again replaces what the day had.
export function weightRoutes() {
  return new Hono<AppEnv>()
    .get('/', async (c) =>
      c.json(await listWeights(database(c.env.DB), c.get('user').id, new Date())),
    )
    .put('/today', measurementBody, async (c) => {
      const saved = await saveToday(
        database(c.env.DB),
        c.get('user').id,
        c.req.valid('json'),
        new Date(),
      );
      return c.json({ weight: saved });
    });
}

export async function saveToday(
  db: Database,
  userId: number,
  measurement: Measurement,
  now: Date,
): Promise<Weight> {
  const values = { weightKg: measurement.weightKg, bodyFatPct: measurement.bodyFatPct ?? null };
  const [saved] = await db
    .insert(weights)
    .values({ userId, date: tokyoDate(now), ...values })
    .onConflictDoUpdate({
      target: [weights.userId, weights.date],
      set: { ...values, updatedAt: NOW },
    })
    .returning(shown);
  if (saved === undefined) throw new Error('the weight was not stored');
  return saved;
}

// Every weight, newest first, with today's date so the page can tell today's row and
// label the days without a clock of its own.
export async function listWeights(db: Database, userId: number, now: Date): Promise<Weights> {
  const rows = await db
    .select(shown)
    .from(weights)
    .where(eq(weights.userId, userId))
    .orderBy(desc(weights.date));
  return { today: tokyoDate(now), weights: rows };
}

// The weights of the days in the range, oldest first: what the coach reads.
export function weightsBetween(db: Database, userId: number, { from, to }: DayRange) {
  return db
    .select(shown)
    .from(weights)
    .where(and(eq(weights.userId, userId), gte(weights.date, from), lte(weights.date, to)))
    .orderBy(weights.date);
}
