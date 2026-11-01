import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database, type Database } from './db/index.ts';
import { entries, pushSubscriptions } from './db/schema.ts';
import {
  sendWeeklyReminder,
  weekCounts,
  weeklyReminder,
  type Send,
  type Vapid,
} from './reminder.ts';
import { platform } from './test/platform.ts';
import { findOrCreateUser } from './users.ts';

// Thursday 2026-11-05 12:00 in Tokyo.
const now = new Date('2026-11-05T03:00:00Z');

const base64url = (bytes: ArrayBuffer) => Buffer.from(bytes).toString('base64url');

// Node types generateKey and exportKey as unions over every algorithm; these are the
// P-256 shapes the tests use.
async function keyPair(name: 'ECDH' | 'ECDSA', usages: string[]): Promise<CryptoKeyPair> {
  const pair = await crypto.subtle.generateKey({ name, namedCurve: 'P-256' }, true, usages);
  if (!('privateKey' in pair)) throw new Error('expected a key pair');
  return pair;
}

async function rawKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  if (!(exported instanceof ArrayBuffer)) throw new Error('expected raw bytes');
  return base64url(exported);
}

async function privateScalar(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('jwk', key);
  if (exported instanceof ArrayBuffer || exported.d === undefined) {
    throw new Error('expected a JWK with d');
  }
  return exported.d;
}

// A browser-side key pair, as PushManager.subscribe() would make one; the Worker's
// encryption needs real P-256 material to run.
async function browserKeys() {
  const pair = await keyPair('ECDH', ['deriveBits']);
  return {
    p256dh: await rawKey(pair.publicKey),
    auth: base64url(crypto.getRandomValues(new Uint8Array(16)).buffer),
  };
}

// The Worker's own pair, generated here so the tests never read .dev.vars.
async function serverVapid(): Promise<Vapid> {
  const pair = await keyPair('ECDSA', ['sign']);
  return {
    subject: 'mailto:owner@example.com',
    publicKey: await rawKey(pair.publicKey),
    privateKey: await privateScalar(pair.privateKey),
  };
}

const note = (userId: number, date: string, kind: 'win' | 'slip') => ({
  userId,
  date,
  kind,
  category: 'life' as const,
  body: kind,
});

const answering =
  (status: (endpoint: string) => number) =>
  (calls: { endpoint: string; init: RequestInit }[]): Send =>
  (endpoint, init) => {
    calls.push({ endpoint, init });
    return Promise.resolve(new Response(null, { status: status(endpoint) }));
  };

describe('weeklyReminder', () => {
  it('counts the week in the words of the notification screen', () => {
    expect(weeklyReminder(9, 2).body).toBe(
      '9 wins and 2 slips this week. Open to look back with your coach.',
    );
  });

  it('uses the singular for one and keeps a zero on the other side', () => {
    expect(weeklyReminder(1, 0).body).toBe(
      '1 win and 0 slips this week. Open to look back with your coach.',
    );
  });

  it('leaves out the count for a week without notes', () => {
    expect(weeklyReminder(0, 0).body).toBe('Open to look back with your coach.');
  });

  it('opens the weekly review when tapped', () => {
    expect(weeklyReminder(3, 1)).toMatchObject({
      title: 'Time for your weekly review?',
      tag: 'weekly-review',
      url: '/coach/weekly-review',
    });
  });
});

describe('weekCounts', () => {
  let proxy: PlatformProxy<Env>;
  let db: Database;

  beforeAll(async () => {
    proxy = await platform();
    db = database(proxy.env.DB);
  });

  afterAll(() => proxy.dispose());

  it('counts only this Tokyo week, Monday to today, and only this user', async () => {
    const me = await findOrCreateUser(db, 'counts-me@example.com');
    const other = await findOrCreateUser(db, 'counts-other@example.com');
    await db.insert(entries).values([
      note(me.id, '2026-11-01', 'win'), // last Sunday
      note(me.id, '2026-11-02', 'win'), // this Monday
      note(me.id, '2026-11-05', 'win'), // today
      note(me.id, '2026-11-05', 'slip'),
      note(me.id, '2026-11-06', 'win'), // tomorrow: not yet
      note(other.id, '2026-11-04', 'slip'),
    ]);

    expect(await weekCounts(db, me.id, now)).toEqual({ win: 2, slip: 1 });
    expect(await weekCounts(db, other.id, now)).toEqual({ win: 0, slip: 1 });
  });
});

describe('sendWeeklyReminder', () => {
  let proxy: PlatformProxy<Env>;
  let db: Database;
  let vapid: Vapid;

  beforeAll(async () => {
    proxy = await platform();
    db = database(proxy.env.DB);
    vapid = await serverVapid();
  });

  afterAll(() => proxy.dispose());

  const subscribe = async (email: string, endpoint: string) => {
    const user = await findOrCreateUser(db, email);
    await db
      .insert(pushSubscriptions)
      .values({ userId: user.id, endpoint, ...(await browserKeys()) });
    return user;
  };

  const endpointsStored = () =>
    db
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .then((rows) => rows.map((row) => row.endpoint));

  it('posts an encrypted, VAPID-signed message to every subscription', async () => {
    const a = 'https://push.example.com/send/all/a';
    const b = 'https://push.example.com/send/all/b';
    await subscribe('all-one@example.com', a);
    await subscribe('all-two@example.com', b);
    const calls: { endpoint: string; init: RequestInit }[] = [];

    const delivery = await sendWeeklyReminder(db, vapid, {
      send: answering(() => 201)(calls),
      now,
    });

    expect(delivery).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(calls.map((call) => call.endpoint).toSorted()).toEqual([a, b]);
    const headers = new Headers(calls[0]?.init.headers);
    expect(calls[0]?.init.method).toMatch(/^post$/i);
    expect(headers.get('authorization')).toMatch(/^vapid t=.+, k=.+$/);
    expect(headers.get('content-encoding')).toBe('aes128gcm');
    expect(headers.get('ttl')).toBe(String(6 * 60 * 60));
    expect(headers.get('topic')).toBe('weekly-review');
    expect(calls[0]?.init.body).toBeInstanceOf(Uint8Array);
  });

  it('forgets a subscription the push service reports gone and keeps the others', async () => {
    const gone = 'https://push.example.com/send/gone';
    const kept = 'https://push.example.com/send/kept';
    await subscribe('gone-one@example.com', gone);
    await subscribe('gone-two@example.com', kept);
    const calls: { endpoint: string; init: RequestInit }[] = [];

    const delivery = await sendWeeklyReminder(db, vapid, {
      send: answering((endpoint) => (endpoint === gone ? 410 : 201))(calls),
      now,
    });

    expect(delivery.removed).toBe(1);
    const stored = await endpointsStored();
    expect(stored).not.toContain(gone);
    expect(stored).toContain(kept);
  });

  it('counts a push service error as a failure without dropping the subscription', async () => {
    const flaky = 'https://push.example.com/send/flaky';
    const user = await subscribe('flaky@example.com', flaky);
    const calls: { endpoint: string; init: RequestInit }[] = [];

    const delivery = await sendWeeklyReminder(db, vapid, {
      send: answering(() => 503)(calls),
      now,
      userId: user.id,
    });

    expect(delivery).toEqual({ sent: 0, removed: 0, failed: 1 });
    expect(await endpointsStored()).toContain(flaky);
  });

  it("sends only to the named user's subscriptions when asked for one user", async () => {
    const mine = 'https://push.example.com/send/mine-only';
    const theirs = 'https://push.example.com/send/theirs-only';
    const me = await subscribe('mine@example.com', mine);
    await subscribe('theirs@example.com', theirs);
    const calls: { endpoint: string; init: RequestInit }[] = [];

    const delivery = await sendWeeklyReminder(db, vapid, {
      send: answering(() => 201)(calls),
      now,
      userId: me.id,
    });

    expect(delivery.sent).toBe(1);
    expect(calls.map((call) => call.endpoint)).toEqual([mine]);
  });
});
