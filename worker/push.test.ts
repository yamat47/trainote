import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appAs, clientAs, platform } from './test/platform.ts';

const endpoint = 'https://push.example.com/send/abc/def?x=1';
const keys = { p256dh: 'p256dh-one', auth: 'auth-one' };

type StoredSubscription = { user_id: number; endpoint: string; p256dh: string; auth: string };

const stored = (db: D1Database) =>
  db
    .prepare('select user_id, endpoint, p256dh, auth from push_subscriptions order by id')
    .all<StoredSubscription>()
    .then((result) => result.results);

const param = (url = endpoint) => ({ param: { endpoint: encodeURIComponent(url) } });

describe('/api/push', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  const subscription = (email: string) =>
    clientAs(proxy.env, email).api.push.subscriptions[':endpoint'];

  it('hands the page the VAPID public key from the Worker configuration', async () => {
    const response = await clientAs(proxy.env, 'owner@example.com').api.push.$get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ vapidPublicKey: proxy.env.VAPID_PUBLIC_KEY });
  });

  it('stores a subscription under its decoded endpoint and replaces its keys on a second put', async () => {
    const first = await subscription('owner@example.com').$put({ ...param(), json: keys });
    const second = await subscription('owner@example.com').$put({
      ...param(),
      json: { p256dh: 'p256dh-two', auth: 'auth-two' },
    });

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    const rows = await stored(proxy.env.DB);
    expect(rows.map((row) => row.endpoint)).toEqual([endpoint]);
    expect(rows[0]).toMatchObject({ p256dh: 'p256dh-two', auth: 'auth-two' });
  });

  it('refuses a body without both keys as problem details', async () => {
    // The typed client cannot send less than both keys, so this goes in raw.
    const response = await appAs('owner@example.com').request(
      `https://trainote.test/api/push/subscriptions/${encodeURIComponent('https://push.example.com/other')}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ p256dh: 'only-one' }),
      },
      proxy.env,
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(await stored(proxy.env.DB)).toHaveLength(1);
  });

  it('refuses an endpoint that is not an https URL', async () => {
    const response = await subscription('owner@example.com').$put({
      ...param('http://push.example.com/plain'),
      json: keys,
    });

    expect(response.status).toBe(400);
  });

  it("deletes only the caller's subscription, and a second delete is still 204", async () => {
    const other = 'https://push.example.com/send/other';
    await subscription('other@example.com').$put({ ...param(other), json: keys });

    const stranger = await subscription('stranger@example.com').$delete(param());
    const owner = await subscription('owner@example.com').$delete(param());
    const again = await subscription('owner@example.com').$delete(param());

    expect(stranger.status).toBe(204);
    expect(owner.status).toBe(204);
    expect(again.status).toBe(204);
    expect((await stored(proxy.env.DB)).map((row) => row.endpoint)).toEqual([other]);
  });

  it('answers 401 without an identity', async () => {
    const response = await clientAs(proxy.env, undefined).api.push.$get();

    expect(response.status).toBe(401);
  });
});
