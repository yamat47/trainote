import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from './app.ts';
import { jsonBody } from './body.ts';
import { database, type Database } from './db/index.ts';
import { entries, workoutItems, type Category, type EntryKind } from './db/schema.ts';
import { problem } from './problem.ts';
import { MAX_NOTE_LENGTH } from './note.ts';
import { DraftEntry, StructureError, type Structure } from './structure.ts';
import { addDays, streak, tokyoDate, tokyoWeek, weekDates, type DayRange } from './week.ts';

const Note = z.object({ text: z.string().trim().min(1).max(MAX_NOTE_LENGTH) });

// More entries than a note of MAX_NOTE_LENGTH can hold, one act per 40 characters; a
// guard against a hand-made request, not a limit the page can reach.
const MAX_ENTRIES = 50;

const Drafts = z.object({ entries: z.array(DraftEntry).min(1).max(MAX_ENTRIES) });

const noteBody = jsonBody(Note, 'Body must carry a non-empty text');
const draftsBody = jsonBody(Drafts, 'Body must carry one or more entries');

export type Item = typeof workoutItems.$inferSelect;
export type Entry = typeof entries.$inferSelect & { items: Item[] };

// The preview is what the page shows before saving and what it sends back to save, so
// nothing is kept between the two calls and a rewritten note is just another preview.
export function entryRoutes(structure: Structure) {
  return new Hono<AppEnv>()
    .get('/', async (c) => {
      const found = await listEntries(database(c.env.DB), c.get('user').id);
      return c.json({ entries: found });
    })
    .get('/week', async (c) =>
      c.json(await weekOf(database(c.env.DB), c.get('user').id, new Date())),
    )
    .post('/preview', noteBody, async (c) => {
      const { text } = c.req.valid('json');
      try {
        return c.json(await structure(c.env, text));
      } catch (error) {
        if (error instanceof StructureError) {
          console.error('note could not be structured', error.reason, error.cause);
          return problem(c, 502, 'The note could not be read');
        }
        throw error;
      }
    })
    .post('/', draftsBody, async (c) => {
      const drafts = c.req.valid('json').entries;
      const saved = await saveEntries(database(c.env.DB), c.get('user').id, drafts, new Date());
      return c.json({ entries: saved }, 201);
    });
}

// Two statements, not one transaction: the item rows need the entry ids, which D1 only
// hands back after the first batch. An entry without its items is still a true record,
// and a save retried after a failure in between stores the entries twice; accepted for
// now (docs/requirements.md, 未決).
export async function saveEntries(
  db: Database,
  userId: number,
  drafts: DraftEntry[],
  now: Date,
): Promise<Entry[]> {
  const date = tokyoDate(now);
  const [first, ...rest] = drafts.map((draft) =>
    db
      .insert(entries)
      .values({ userId, date, kind: draft.kind, category: draft.category, body: draft.body })
      .returning(),
  );
  if (first === undefined) return [];
  const inserted = (await db.batch([first, ...rest])).flat();

  const itemRows = inserted.flatMap((entry, i) =>
    (drafts[i]?.items ?? []).map((item, position) =>
      Object.assign({ entryId: entry.id, position }, item),
    ),
  );
  const items =
    itemRows.length === 0 ? [] : await db.insert(workoutItems).values(itemRows).returning();

  return withItems(inserted, items);
}

// Each entry with its items, in the order the items were stored.
function withItems(rows: (typeof entries.$inferSelect)[], items: Item[]): Entry[] {
  const itemsOf = new Map<number, Item[]>();
  for (const item of items) {
    const list = itemsOf.get(item.entryId);
    if (list === undefined) itemsOf.set(item.entryId, [item]);
    else list.push(item);
  }
  return rows.map((entry) => Object.assign(entry, { items: itemsOf.get(entry.id) ?? [] }));
}

// The entries that fit the condition with their items, in the given order. Two queries
// in one round trip; the items join through entries rather than binding the ids, which
// D1 caps at a hundred parameters.
async function selectEntries(
  db: Database,
  condition: SQL | undefined,
  order: (SQL | SQLiteColumn)[],
): Promise<Entry[]> {
  const [rows, itemRows] = await db.batch([
    db
      .select()
      .from(entries)
      .where(condition)
      .orderBy(...order),
    db
      .select({ item: workoutItems })
      .from(workoutItems)
      .innerJoin(entries, eq(workoutItems.entryId, entries.id))
      .where(condition)
      .orderBy(workoutItems.entryId, workoutItems.position),
  ]);
  return withItems(
    rows,
    itemRows.map(({ item }) => item),
  );
}

// Every entry of the user, newest first, with its items in the order of the note.
export const listEntries = (db: Database, userId: number) =>
  selectEntries(db, eq(entries.userId, userId), [desc(entries.date), desc(entries.id)]);

export type EntryFilter = DayRange & {
  kind?: EntryKind | undefined;
  category?: Category | undefined;
};

// The entries of the days in the range, oldest first, narrowed to a kind or a category
// when one is given: what the coach reads.
export const entriesBetween = (db: Database, userId: number, filter: EntryFilter) =>
  selectEntries(
    db,
    and(
      eq(entries.userId, userId),
      gte(entries.date, filter.from),
      lte(entries.date, filter.to),
      filter.kind === undefined ? undefined : eq(entries.kind, filter.kind),
      filter.category === undefined ? undefined : eq(entries.category, filter.category),
    ),
    [entries.date, entries.id],
  );

// How many wins and slips the user wrote on each day from `from` to `to`, both
// inclusive: the one query behind the week strip and the Sunday reminder.
export function countByDay(db: Database, userId: number, from: string, to: string) {
  return db
    .select({ date: entries.date, kind: entries.kind, n: count() })
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.date, from), lte(entries.date, to)))
    .groupBy(entries.date, entries.kind);
}

export type Day = { date: string; wins: number; slips: number };
// `today` is the server's Tokyo date, so the page labels Today and tints the strip from
// the same clock that filed the entries.
export type Week = { today: string; days: Day[]; streak: number };

// The seven days of this week with their counts, and the run of days written up to now.
export async function weekOf(db: Database, userId: number, now: Date): Promise<Week> {
  const today = tokyoDate(now);
  const { from } = tokyoWeek(now);
  const [counted, written] = await db.batch([
    countByDay(db, userId, from, addDays(from, 6)),
    db.selectDistinct({ date: entries.date }).from(entries).where(eq(entries.userId, userId)),
  ]);
  const days = weekDates(now).map((date): Day => ({ date, wins: 0, slips: 0 }));
  for (const row of counted) {
    const day = days.find((d) => d.date === row.date);
    if (day !== undefined) day[row.kind === 'win' ? 'wins' : 'slips'] = row.n;
  }
  return {
    today,
    days,
    streak: streak(
      written.map((row) => row.date),
      today,
    ),
  };
}
