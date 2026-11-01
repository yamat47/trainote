import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { hc } from 'hono/client';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { createApp, type AppType } from '../app.ts';
import type { IdentityResolver } from '../auth/identity.ts';
import type { Structure } from '../structure.ts';

const root = path.resolve(import.meta.dirname, '..', '..');

// A local D1 with the committed migrations applied, thrown away with the proxy.
export async function platform(): Promise<PlatformProxy<Env>> {
  const proxy = await getPlatformProxy<Env>({
    configPath: path.join(root, 'wrangler.jsonc'),
    persist: false,
  });
  await applyMigrations(proxy.env.DB);
  return proxy;
}

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

// No test reaches Claude; a route that needs the structurer gets one from its test.
const noStructure: Structure = () => Promise.reject(new Error('no structurer in this test'));

// The app with Access replaced by a fixed identity (or none).
export const appAs = (email: string | undefined, structure: Structure = noStructure) =>
  createApp({ identity: identityOf(email), structure });

// The same typed client the page uses, pointed at the app instead of the network.
export function clientAs(env: Env, email: string | undefined, structure?: Structure) {
  const app = appAs(email, structure);
  return hc<AppType>('https://trainote.test', {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(app.request(input, init, env)),
  });
}
