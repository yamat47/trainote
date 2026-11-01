import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from './app.ts';
import { jsonBody } from './body.ts';
import { database, type Database } from './db/index.ts';
import { NOW, profiles } from './db/schema.ts';
import { WeightKg } from './weights.ts';

// The goal: a weight to reach and, optionally, the day to reach it by. Either can be
// cleared with null.
export const Goal = z.object({
  goalWeightKg: WeightKg.nullable(),
  goalDeadline: z.iso.date().nullable(),
});
export type Goal = z.infer<typeof Goal>;

const goalBody = jsonBody(Goal, 'Body must carry a goal weight in kg and a deadline, each or null');

// What the page reads of the profile so far; the other fields arrive with their rows.
const shown = { goalWeightKg: profiles.goalWeightKg, goalDeadline: profiles.goalDeadline };

export type Profile = Pick<typeof profiles.$inferSelect, 'goalWeightKg' | 'goalDeadline'>;

const EMPTY: Profile = { goalWeightKg: null, goalDeadline: null };

export function profileRoutes() {
  return new Hono<AppEnv>()
    .get('/', async (c) => c.json(await readProfile(database(c.env.DB), c.get('user').id)))
    .put('/goal', goalBody, async (c) =>
      c.json(await saveGoal(database(c.env.DB), c.get('user').id, c.req.valid('json'))),
    );
}

// A person has a profile row once they set something in it; before that, every field
// is empty.
export async function readProfile(db: Database, userId: number): Promise<Profile> {
  const [row] = await db.select(shown).from(profiles).where(eq(profiles.userId, userId));
  return row ?? EMPTY;
}

export async function saveGoal(db: Database, userId: number, goal: Goal): Promise<Profile> {
  const [saved] = await db
    .insert(profiles)
    .values({ userId, ...goal })
    .onConflictDoUpdate({ target: profiles.userId, set: { ...goal, updatedAt: NOW } })
    .returning(shown);
  if (saved === undefined) throw new Error('the goal was not stored');
  return saved;
}
