import { eq } from 'drizzle-orm';
import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database } from './db/index.ts';
import { entries, workoutItems } from './db/schema.ts';
import { StructureError, type Structure } from './structure.ts';
import { appAs, clientAs, platform, userIdOf as idOf } from './test/platform.ts';
import { NOTE, PREVIEW } from './test/preview.ts';
import { addDays, tokyoDate, weekDates } from './week.ts';

const refusing: Structure = () => Promise.reject(new StructureError('refused'));

// Each test owns its bodies, so the rows one test stores never decide another.
const storedEntries = (d1: D1Database, body: string) =>
  database(d1).select().from(entries).where(eq(entries.body, body)).orderBy(entries.id);

const storedItems = (d1: D1Database, entryId: number) =>
  database(d1)
    .select()
    .from(workoutItems)
    .where(eq(workoutItems.entryId, entryId))
    .orderBy(workoutItems.position);

describe('/api/entries', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  const userIdOf = (email: string) => idOf(proxy.env, email);

  describe('GET /', () => {
    it("lists the caller's entries newest first with their items, and nobody else's", async () => {
      const mine = await userIdOf('list@example.com');
      const other = await userIdOf('other-list@example.com');
      const today = tokyoDate(new Date());
      const [older, newer] = await database(proxy.env.DB)
        .insert(entries)
        .values([
          {
            userId: mine,
            date: addDays(today, -1),
            kind: 'win',
            category: 'exercise',
            body: 'ジムで胸と脚',
          },
          { userId: mine, date: today, kind: 'slip', category: 'sleep', body: '夜更かし (list)' },
          { userId: other, date: today, kind: 'win', category: 'life', body: '他人の行' },
        ])
        .returning();
      if (older === undefined || newer === undefined) throw new Error('rows were not inserted');
      await database(proxy.env.DB)
        .insert(workoutItems)
        .values([
          {
            entryId: older.id,
            position: 1,
            exercise: 'スクワット',
            weightKg: 80,
            reps: 8,
            sets: 3,
          },
          {
            entryId: older.id,
            position: 0,
            exercise: 'ベンチプレス',
            weightKg: 60,
            reps: 10,
            sets: 3,
          },
        ]);

      const response = await clientAs(proxy.env, 'list@example.com').api.entries.$get();

      expect(response.status).toBe(200);
      const listed = (await response.json()).entries;
      expect(
        listed.map((entry) => [entry.date, entry.body, entry.items.map((item) => item.exercise)]),
      ).toEqual([
        [today, '夜更かし (list)', []],
        [addDays(today, -1), 'ジムで胸と脚', ['ベンチプレス', 'スクワット']],
      ]);
    });
  });

  describe('GET /week', () => {
    it('counts this week Monday first and the days written in a row', async () => {
      const me = await userIdOf('week@example.com');
      const today = tokyoDate(new Date());
      const yesterday = addDays(today, -1);
      await database(proxy.env.DB)
        .insert(entries)
        .values([
          { userId: me, date: today, kind: 'win', category: 'food', body: 'w1' },
          { userId: me, date: today, kind: 'win', category: 'life', body: 'w2' },
          { userId: me, date: today, kind: 'slip', category: 'sleep', body: 's1' },
          { userId: me, date: yesterday, kind: 'win', category: 'food', body: 'w3' },
          { userId: me, date: addDays(today, -3), kind: 'win', category: 'food', body: 'w4' },
        ]);

      const response = await clientAs(proxy.env, 'week@example.com').api.entries.week.$get();

      expect(response.status).toBe(200);
      const week = await response.json();
      // Yesterday may be last week, in which case the strip does not show it.
      const wins: Record<string, number> = { [today]: 2, [yesterday]: 1, [addDays(today, -3)]: 1 };
      const slips: Record<string, number> = { [today]: 1 };
      expect(week.days).toEqual(
        weekDates(new Date()).map((date) => ({
          date,
          wins: wins[date] ?? 0,
          slips: slips[date] ?? 0,
        })),
      );
      expect(week.streak).toBe(2);
      expect(week.today).toBe(today);
    });
  });

  describe('POST /preview', () => {
    it('hands the note to the structurer and returns its preview', async () => {
      const notes: string[] = [];
      const structure: Structure = (_env, text) => {
        notes.push(text);
        return Promise.resolve(PREVIEW);
      };

      const response = await clientAs(proxy.env, 'owner@example.com', {
        structure,
      }).api.entries.preview.$post({ json: { text: NOTE } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(PREVIEW);
      expect(notes).toEqual([NOTE]);
    });

    it('refuses a blank note without asking the structurer', async () => {
      let asked = false;
      const structure: Structure = () => {
        asked = true;
        return Promise.resolve(PREVIEW);
      };

      const response = await clientAs(proxy.env, 'owner@example.com', {
        structure,
      }).api.entries.preview.$post({ json: { text: '   \n' } });

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      expect(asked).toBe(false);
    });

    it('answers 502 when the note could not be structured', async () => {
      const response = await clientAs(proxy.env, 'owner@example.com', {
        structure: refusing,
      }).api.entries.preview.$post({ json: { text: 'a note' } });

      expect(response.status).toBe(502);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
    });
  });

  describe('POST /', () => {
    it('saves the previewed entries and their items under today in Tokyo', async () => {
      const response = await clientAs(proxy.env, 'owner@example.com').api.entries.$post({
        json: { entries: PREVIEW.entries },
      });

      if (!response.ok) throw new Error(`answered ${String(response.status)}`);
      expect(response.status).toBe(201);
      const today = tokyoDate(new Date());
      const saved = (await response.json()).entries;
      expect(saved.map((entry) => [entry.date, entry.kind, entry.category, entry.body])).toEqual([
        [today, 'win', 'exercise', 'ベンチ'],
        [today, 'win', 'food', 'お菓子我慢した'],
        [today, 'slip', 'sleep', '夜更かしした'],
      ]);
      expect(saved[0]?.items).toMatchObject([
        { position: 0, exercise: 'ベンチプレス', weightKg: 60, reps: 10, sets: 3 },
      ]);
      expect(saved[1]?.items).toEqual([]);

      const [bench] = await storedEntries(proxy.env.DB, 'ベンチ');
      if (bench === undefined) throw new Error('the bench entry was not stored');
      expect(bench).toMatchObject({ date: today, kind: 'win', category: 'exercise' });
      expect(await storedItems(proxy.env.DB, bench.id)).toMatchObject([
        { entryId: bench.id, position: 0, exercise: 'ベンチプレス', weightKg: 60 },
      ]);
    });

    it('keeps the items in the order of the note', async () => {
      const response = await clientAs(proxy.env, 'owner@example.com').api.entries.$post({
        json: {
          entries: [
            {
              kind: 'win',
              category: 'exercise',
              body: 'スクワット',
              items: [10, 8, 6].map((reps) => ({
                exercise: 'スクワット',
                weightKg: 80,
                reps,
                sets: null,
                durationMin: null,
                distanceKm: null,
              })),
            },
          ],
        },
      });

      expect(response.status).toBe(201);
      const [squat] = await storedEntries(proxy.env.DB, 'スクワット');
      if (squat === undefined) throw new Error('the squat entry was not stored');
      expect(
        (await storedItems(proxy.env.DB, squat.id)).map((row) => [row.position, row.reps]),
      ).toEqual([
        [0, 10],
        [1, 8],
        [2, 6],
      ]);
    });

    it('stores the entries under the caller, not under whoever else exists', async () => {
      const response = await clientAs(proxy.env, 'second@example.com').api.entries.$post({
        json: { entries: [{ kind: 'win', category: 'life', body: '早起きした', items: [] }] },
      });
      const me = await clientAs(proxy.env, 'second@example.com').api.me.$get();

      expect(response.status).toBe(201);
      const { id } = await me.json();
      expect(await storedEntries(proxy.env.DB, '早起きした')).toMatchObject([
        { userId: id, date: tokyoDate(new Date()), kind: 'win', category: 'life' },
      ]);
    });

    it('refuses an empty list and an unknown category as problem details', async () => {
      const empty = await clientAs(proxy.env, 'owner@example.com').api.entries.$post({
        json: { entries: [] },
      });
      // The typed client cannot send an unknown category, so this goes in raw.
      const unknown = await appAs('owner@example.com').request(
        'https://trainote.test/api/entries',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            entries: [{ kind: 'win', category: 'mood', body: 'x', items: [] }],
          }),
        },
        proxy.env,
      );

      expect(empty.status).toBe(400);
      expect(unknown.status).toBe(400);
      expect(unknown.headers.get('content-type')).toBe('application/problem+json');
      expect(await storedEntries(proxy.env.DB, 'x')).toHaveLength(0);
    });
  });
});
