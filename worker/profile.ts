import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from './app.ts';
import { jsonBody } from './body.ts';
import { database, type Database } from './db/index.ts';
import { NOW, profiles } from './db/schema.ts';
import {
  MAX_COACH_NOTES_LENGTH,
  MAX_EQUIPMENT_LENGTH,
  MAX_HEIGHT_CM,
  MAX_SHORT_TEXT_LENGTH,
  MAX_WEEKLY_SESSIONS,
  MIN_BIRTH_YEAR,
  MIN_HEIGHT_CM,
  thisYear,
} from './profile-fields.ts';
import { WeightKg } from './weights.ts';

// The profile is saved a group of fields at a time, as Profile shows it, and each group
// is sent whole: a field the person emptied is null, which clears it.

// Text as written, without the spaces around it; a blank clears it as null does.
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

// The goal: a weight to reach and, optionally, the day to reach it by.
export const Goal = z.object({
  goalWeightKg: WeightKg.nullable(),
  goalDeadline: z.iso.date().nullable(),
});
export type Goal = z.infer<typeof Goal>;

// About you: height, the year they were born, and sex in their own word.
export const About = z.object({
  heightCm: z.number().gte(MIN_HEIGHT_CM).lt(MAX_HEIGHT_CM).multipleOf(0.1).nullable(),
  birthYear: z
    .number()
    .int()
    .gte(MIN_BIRTH_YEAR)
    .refine((year) => year <= thisYear(new Date()))
    .nullable(),
  sex: text(MAX_SHORT_TEXT_LENGTH),
});
export type About = z.infer<typeof About>;

// Training: where they train, how many days a week, and what they train with.
export const Training = z.object({
  trainingPlace: text(MAX_SHORT_TEXT_LENGTH),
  weeklySessions: z.number().int().gte(0).lte(MAX_WEEKLY_SESSIONS).nullable(),
  equipment: text(MAX_EQUIPMENT_LENGTH),
});
export type Training = z.infer<typeof Training>;

// Notes for the coach: injuries, habits, anything else it should keep in mind.
export const CoachNotes = z.object({ constraints: text(MAX_COACH_NOTES_LENGTH) });
export type CoachNotes = z.infer<typeof CoachNotes>;

const goalBody = jsonBody(Goal, 'Body must carry a goal weight in kg and a deadline, each or null');
const aboutBody = jsonBody(
  About,
  'Body must carry a height in cm, a birth year and a sex, each or null',
);
const trainingBody = jsonBody(
  Training,
  'Body must carry a place, sessions per week and equipment, each or null',
);
const notesBody = jsonBody(CoachNotes, 'Body must carry the notes for the coach, or null');

// What the page reads of the profile: every field; the owner and the time stay in the
// database.
const shown = {
  heightCm: profiles.heightCm,
  birthYear: profiles.birthYear,
  sex: profiles.sex,
  goalWeightKg: profiles.goalWeightKg,
  goalDeadline: profiles.goalDeadline,
  trainingPlace: profiles.trainingPlace,
  weeklySessions: profiles.weeklySessions,
  equipment: profiles.equipment,
  constraints: profiles.constraints,
};

export type Profile = Pick<typeof profiles.$inferSelect, keyof typeof shown>;

// Every field, for the coach's prompt; undefined before the person set anything.
export type FullProfile = typeof profiles.$inferSelect;

const EMPTY: Profile = {
  heightCm: null,
  birthYear: null,
  sex: null,
  goalWeightKg: null,
  goalDeadline: null,
  trainingPlace: null,
  weeklySessions: null,
  equipment: null,
  constraints: null,
};

// Each put answers the whole profile, so the page shows what was stored.
export function profileRoutes() {
  return new Hono<AppEnv>()
    .get('/', async (c) => c.json(await readProfile(database(c.env.DB), c.get('user').id)))
    .put('/about', aboutBody, async (c) =>
      c.json(await saveGroup(database(c.env.DB), c.get('user').id, c.req.valid('json'))),
    )
    .put('/goal', goalBody, async (c) =>
      c.json(await saveGroup(database(c.env.DB), c.get('user').id, c.req.valid('json'))),
    )
    .put('/training', trainingBody, async (c) =>
      c.json(await saveGroup(database(c.env.DB), c.get('user').id, c.req.valid('json'))),
    )
    .put('/notes', notesBody, async (c) =>
      c.json(await saveGroup(database(c.env.DB), c.get('user').id, c.req.valid('json'))),
    );
}

// A person has a profile row once they set something in it; before that, every field
// is empty.
export async function readProfile(db: Database, userId: number): Promise<Profile> {
  const [row] = await db.select(shown).from(profiles).where(eq(profiles.userId, userId));
  return row ?? EMPTY;
}

// One group's fields over the stored row, the others kept; the row is made by the first
// save of any group.
export async function saveGroup(
  db: Database,
  userId: number,
  group: Goal | About | Training | CoachNotes,
): Promise<Profile> {
  const [saved] = await db
    .insert(profiles)
    .values({ userId, ...group })
    .onConflictDoUpdate({ target: profiles.userId, set: { ...group, updatedAt: NOW } })
    .returning(shown);
  if (saved === undefined) throw new Error('the profile was not stored');
  return saved;
}

export async function readFullProfile(
  db: Database,
  userId: number,
): Promise<FullProfile | undefined> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row;
}
