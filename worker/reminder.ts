import { buildPushPayload } from '@block65/webcrypto-web-push';
import { and, count, eq, gte, lte } from 'drizzle-orm';
import type { Database } from './db/index.ts';
import { entries, pushSubscriptions, type EntryKind } from './db/schema.ts';
import { tokyoWeek } from './week.ts';

export type Vapid = { subject: string; publicKey: string; privateKey: string };

export const vapidOf = (env: Env): Vapid => ({
  subject: env.VAPID_SUBJECT,
  publicKey: env.VAPID_PUBLIC_KEY,
  privateKey: env.VAPID_PRIVATE_KEY,
});

// What public/sw.js reads out of the push message.
export type Reminder = { title: string; body: string; tag: string; url: string };

const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

// The words of the design's notification screen. A week without a single note gets the
// invitation alone rather than "0 wins and 0 slips".
export function weeklyReminder(wins: number, slips: number): Reminder {
  const invitation = 'Open to look back with your coach.';
  const body =
    wins === 0 && slips === 0
      ? invitation
      : `${plural(wins, 'win')} and ${plural(slips, 'slip')} this week. ${invitation}`;
  return {
    title: 'Time for your weekly review?',
    body,
    tag: 'weekly-review',
    url: '/coach/weekly-review',
  };
}

export type WeekCounts = Record<EntryKind, number>;

// How many wins and slips the user wrote in the Tokyo week of `now`, Monday to that day.
export async function weekCounts(db: Database, userId: number, now: Date): Promise<WeekCounts> {
  const { from, to } = tokyoWeek(now);
  const rows = await db
    .select({ kind: entries.kind, n: count() })
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.date, from), lte(entries.date, to)))
    .groupBy(entries.kind);
  const counts: WeekCounts = { win: 0, slip: 0 };
  for (const row of rows) counts[row.kind] = row.n;
  return counts;
}

export type Send = (endpoint: string, init: RequestInit) => Promise<Response>;

export type Delivery = { sent: number; removed: number; failed: number };

type Options = { send?: Send; now?: Date; userId?: number };

type Subscription = typeof pushSubscriptions.$inferSelect;

type Result = keyof Delivery;

// Six hours: a phone that is off on Sunday evening still gets it before bed, and one
// that is off all night does not get Sunday's reminder on Monday.
const TTL_SECONDS = 6 * 60 * 60;

async function deliver(
  db: Database,
  vapid: Vapid,
  send: Send,
  subscription: Subscription,
  counts: WeekCounts,
): Promise<Result> {
  try {
    const payload = await buildPushPayload(
      {
        data: weeklyReminder(counts.win, counts.slip),
        options: { ttl: TTL_SECONDS, urgency: 'normal', topic: 'weekly-review' },
      },
      {
        endpoint: subscription.endpoint,
        expirationTime: null,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      vapid,
    );
    const response = await send(subscription.endpoint, payload);
    if (response.status === 404 || response.status === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      return 'removed';
    }
    if (response.ok) return 'sent';
    console.error('push service answered', response.status, 'for', subscription.endpoint);
    return 'failed';
  } catch (error) {
    console.error('push to', subscription.endpoint, 'failed', error);
    return 'failed';
  }
}

// Sends the week's reminder to every stored subscription, or to one user's, and forgets
// the subscriptions the push service reports gone (404 or 410). A failure at one
// subscription does not stop the others.
export async function sendWeeklyReminder(
  db: Database,
  vapid: Vapid,
  { send = fetch, now = new Date(), userId }: Options = {},
): Promise<Delivery> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(userId === undefined ? undefined : eq(pushSubscriptions.userId, userId));
  const userIds = [...new Set(subscriptions.map((subscription) => subscription.userId))];
  const countsByUser = new Map(
    await Promise.all(userIds.map(async (id) => [id, await weekCounts(db, id, now)] as const)),
  );
  const results = await Promise.all(
    subscriptions.map((subscription) => {
      const counts = countsByUser.get(subscription.userId) ?? { win: 0, slip: 0 };
      return deliver(db, vapid, send, subscription, counts);
    }),
  );
  const delivery: Delivery = { sent: 0, removed: 0, failed: 0 };
  for (const result of results) delivery[result] += 1;
  return delivery;
}
