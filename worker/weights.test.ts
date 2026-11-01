import { setTimeout as sleep } from 'node:timers/promises';
import { eq } from 'drizzle-orm';
import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database } from './db/index.ts';
import { weights } from './db/schema.ts';
import { appAs, clientAs, platform, userIdOf } from './test/platform.ts';
import { addDays, tokyoDate } from './week.ts';

describe('/api/weights', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  const stored = (userId: number) =>
    database(proxy.env.DB).select().from(weights).where(eq(weights.userId, userId));

  describe('PUT /today', () => {
    it("stores today's weight, and a second put replaces it instead of adding a row", async () => {
      const api = clientAs(proxy.env, 'today@example.com').api.weights;
      const first = await api.today.$put({ json: { weightKg: 64.2 } });
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({
        weight: { date: tokyoDate(new Date()), weightKg: 64.2, bodyFatPct: null },
      });
      const userId = await userIdOf(proxy.env, 'today@example.com');
      const [before] = await stored(userId);

      // The upsert's set names updatedAt itself, which $onUpdate would not reach.
      await sleep(5);
      const second = await api.today.$put({ json: { weightKg: 64.4, bodyFatPct: 18.4 } });
      expect(second.status).toBe(200);
      const rows = await stored(userId);
      expect(rows.map((row) => [row.date, row.weightKg, row.bodyFatPct])).toEqual([
        [tokyoDate(new Date()), 64.4, 18.4],
      ]);
      expect(rows[0]?.createdAt).toBe(before?.createdAt);
      // RFC 3339 in UTC sorts as text.
      expect((rows[0]?.updatedAt ?? '') > (before?.updatedAt ?? '')).toBe(true);
    });

    it('refuses a weight with more than one decimal, or none at all', async () => {
      const api = clientAs(proxy.env, 'precise@example.com').api.weights;
      const fine = await api.today.$put({ json: { weightKg: 64.25 } });
      expect(fine.status).toBe(400);
      expect(fine.headers.get('content-type')).toBe('application/problem+json');
      // The typed client would not send this; a hand-made request might.
      const missing = await appAs('precise@example.com').request(
        '/api/weights/today',
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bodyFatPct: 18 }),
        },
        proxy.env,
      );
      expect(missing.status).toBe(400);
    });
  });

  describe('GET /', () => {
    it("lists the caller's weights newest first with today's date, and nobody else's", async () => {
      const mine = await userIdOf(proxy.env, 'list-weights@example.com');
      const other = await userIdOf(proxy.env, 'other-weights@example.com');
      const today = tokyoDate(new Date());
      await database(proxy.env.DB)
        .insert(weights)
        .values([
          { userId: mine, date: addDays(today, -2), weightKg: 65.0 },
          { userId: mine, date: today, weightKg: 64.2, bodyFatPct: 18.4 },
          { userId: other, date: today, weightKg: 80.0 },
        ]);
      const response = await clientAs(proxy.env, 'list-weights@example.com').api.weights.$get();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        today,
        weights: [
          { date: today, weightKg: 64.2, bodyFatPct: 18.4 },
          { date: addDays(today, -2), weightKg: 65.0, bodyFatPct: null },
        ],
      });
    });
  });
});
