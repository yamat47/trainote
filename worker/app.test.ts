import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { createApp } from './app.ts';
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

  it('creates the user on first sight and returns the same row afterwards', async () => {
    const app = createApp(identityOf('first@example.com'));

    const first = await app.request('/api/me', undefined, proxy.env);
    const again = await app.request('/api/me', undefined, proxy.env);

    expect(first.status).toBe(200);
    const created: unknown = await first.json();
    expect(created).toMatchObject({ email: 'first@example.com' });
    expect(await again.json()).toEqual(created);
  });

  it('keeps users apart by email', async () => {
    const one = await (
      await createApp(identityOf('one@example.com')).request('/api/me', undefined, proxy.env)
    ).json();
    const two = await (
      await createApp(identityOf('two@example.com')).request('/api/me', undefined, proxy.env)
    ).json();

    expect(one).not.toEqual(two);
  });

  it('answers 401 as problem details when Access gave no identity', async () => {
    const app = createApp(identityOf(undefined));

    const response = await app.request('/api/me', undefined, proxy.env);

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(await response.json()).toEqual({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
    });
  });
});
