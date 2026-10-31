import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { hc } from 'hono/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { createApp, type AppType } from './app.ts';
import type { IdentityResolver } from './auth/identity.ts';

const root = path.resolve(import.meta.dirname, '..');

// drizzle-kit writes one file per migration with this marker between statements.
async function applyMigrations(db: D1Database) {
  const dir = path.join(root, 'migrations');
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).toSorted();
  const sources = await Promise.all(files.map((file) => readFile(path.join(dir, file), 'utf8')));
  const statements = sources
    .flatMap((sql) => sql.split('--> statement-breakpoint'))
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');
  await db.batch(statements.map((statement) => db.prepare(statement)));
}

const identityOf =
  (email: string | undefined): IdentityResolver =>
  () =>
    Promise.resolve(email === undefined ? undefined : { email });

describe('GET /api/me', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await getPlatformProxy<Env>({
      configPath: path.join(root, 'wrangler.jsonc'),
      persist: false,
    });
    await applyMigrations(proxy.env.DB);
  });

  afterAll(() => proxy.dispose());

  // The same typed client the page uses, pointed at the app instead of the network.
  const clientAs = (email: string | undefined) => {
    const app = createApp(identityOf(email));
    return hc<AppType>('https://trainote.test', {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(app.request(input, init, proxy.env)),
    });
  };

  it('creates the user on first sight and returns the same row afterwards', async () => {
    const client = clientAs('first@example.com');

    const first = await client.api.me.$get();
    const again = await client.api.me.$get();

    expect(first.status).toBe(200);
    const created = await first.json();
    expect(created).toMatchObject({ email: 'first@example.com' });
    expect(await again.json()).toEqual(created);
  });

  it('gives each email its own user', async () => {
    const one = await (await clientAs('one@example.com').api.me.$get()).json();
    const two = await (await clientAs('two@example.com').api.me.$get()).json();

    expect(one.email).toBe('one@example.com');
    expect(two.email).toBe('two@example.com');
    expect(one.id).not.toBe(two.id);
  });

  it('answers 401 as problem details when Access gave no identity', async () => {
    const response = await clientAs(undefined).api.me.$get();

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(await response.json()).toEqual({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
    });
  });
});
