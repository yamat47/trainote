import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { z } from 'zod';
import type { AppEnv } from './app.ts';
import { database, type Database } from './db/index.ts';
import { entries, workoutItems } from './db/schema.ts';
import { problem } from './problem.ts';
import { MAX_NOTE_LENGTH } from './note.ts';
import { DraftEntry, StructureError, type Structure } from './structure.ts';
import { tokyoDate } from './week.ts';

const Note = z.object({ text: z.string().trim().min(1).max(MAX_NOTE_LENGTH) });

// More entries than a note of MAX_NOTE_LENGTH can hold, one act per 40 characters; a
// guard against a hand-made request, not a limit the page can reach.
const MAX_ENTRIES = 50;

const Drafts = z.object({ entries: z.array(DraftEntry).min(1).max(MAX_ENTRIES) });

// A JSON body that must fit the schema, or a 400 problem with the given title.
const jsonBody = <T>(schema: z.ZodType<T>, title: string) =>
  validator('json', (value, c) => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : problem(c, 400, title);
  });

const noteBody = jsonBody(Note, 'Body must carry a non-empty text');
const draftsBody = jsonBody(Drafts, 'Body must carry one or more entries');

export type Item = typeof workoutItems.$inferSelect;
export type Entry = typeof entries.$inferSelect & { items: Item[] };

// The preview is what the page shows before saving and what it sends back to save, so
// nothing is kept between the two calls and a rewritten note is just another preview.
export function entryRoutes(structure: Structure) {
  return new Hono<AppEnv>()
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

  return inserted.map((entry) =>
    Object.assign(entry, { items: items.filter((item) => item.entryId === entry.id) }),
  );
}
