import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { validator } from 'hono/validator';
import type { AppEnv } from './app.ts';
import { database } from './db/index.ts';
import { pushSubscriptions } from './db/schema.ts';
import { problem } from './problem.ts';

type SubscriptionKeys = { p256dh: string; auth: string };

// The two keys of a PushSubscription, as PushSubscription.toJSON() gives them.
function keysOf(body: unknown): SubscriptionKeys | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  if (!('p256dh' in body) || typeof body.p256dh !== 'string' || body.p256dh === '') {
    return undefined;
  }
  if (!('auth' in body) || typeof body.auth !== 'string' || body.auth === '') return undefined;
  return { p256dh: body.p256dh, auth: body.auth };
}

// Push services only hand out https endpoints; anything else is a client bug.
const isEndpoint = (value: string) => URL.canParse(value) && new URL(value).protocol === 'https:';

const subscriptionKeys = validator('json', (value, c) => {
  const keys = keysOf(value);
  return keys ?? problem(c, 400, 'Body must carry p256dh and auth');
});

const endpointParam = validator('param', (value, c) => {
  const endpoint = value['endpoint'];
  return endpoint !== undefined && isEndpoint(endpoint)
    ? { endpoint }
    : problem(c, 400, 'Endpoint must be an https URL');
});

// The subscription's endpoint is its identity, so the client addresses it in the path,
// URL-encoded. Storing it again with new keys is how a browser rotates them.
export function pushRoutes() {
  return new Hono<AppEnv>()
    .get('/', (c) => {
      // Widened from the literal that `wrangler types` writes for the var.
      const vapidPublicKey: string = c.env.VAPID_PUBLIC_KEY;
      return c.json({ vapidPublicKey });
    })
    .put('/subscriptions/:endpoint', endpointParam, subscriptionKeys, async (c) => {
      const { endpoint } = c.req.valid('param');
      const keys = c.req.valid('json');
      const userId = c.get('user').id;
      await database(c.env.DB)
        .insert(pushSubscriptions)
        .values({ userId, endpoint, ...keys })
        .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, ...keys } });
      return c.body(null, 204);
    })
    .delete('/subscriptions/:endpoint', endpointParam, async (c) => {
      const { endpoint } = c.req.valid('param');
      await database(c.env.DB)
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.endpoint, endpoint),
            eq(pushSubscriptions.userId, c.get('user').id),
          ),
        );
      return c.body(null, 204);
    });
}
