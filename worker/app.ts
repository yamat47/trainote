import { Hono, type Context } from 'hono';
import { accessIdentity, type AccessContext, type IdentityResolver } from './auth/identity.ts';
import { database } from './db/index.ts';
import type { User } from './db/schema.ts';
import { entryRoutes } from './entries.ts';
import { problem } from './problem.ts';
import { profileRoutes } from './profile.ts';
import { pushRoutes } from './push.ts';
import { structureWithClaude, type Structure } from './structure.ts';
import { findOrCreateUser } from './users.ts';
import { weightRoutes } from './weights.ts';

export type AppEnv = {
  Bindings: Env;
  Variables: { user: User };
};

// What the app reaches outside itself; tests hand in their own.
type Overrides = {
  identity?: IdentityResolver | undefined;
  structure?: Structure | undefined;
};

export function createApp({
  identity = accessIdentity(),
  structure = structureWithClaude(),
}: Overrides = {}) {
  const api = new Hono<AppEnv>().basePath('/api');

  api.use(async (c, next) => {
    const config = { teamDomain: c.env.ACCESS_TEAM_DOMAIN, aud: c.env.ACCESS_AUD };
    const found = await identity(c.req.raw, config, accessContext(c));
    if (found === undefined) return problem(c, 401, 'Unauthorized');
    c.set('user', await findOrCreateUser(database(c.env.DB), found.email));
    return next();
  });

  return api
    .get('/me', (c) => c.json(c.get('user')))
    .route('/push', pushRoutes())
    .route('/entries', entryRoutes(structure))
    .route('/weights', weightRoutes())
    .route('/profile', profileRoutes());
}

export type AppType = ReturnType<typeof createApp>;

// Hono types the execution context as the few members it uses and throws when there is
// none, which is how tests call the app. The object itself is the Workers
// ExecutionContext, which carries the Access binding.
function accessContext(c: Context<AppEnv>): AccessContext | undefined {
  try {
    const ctx: unknown = c.executionCtx;
    return isAccessContext(ctx) ? ctx : undefined;
  } catch {
    return undefined;
  }
}

function isAccessContext(value: unknown): value is AccessContext {
  return typeof value === 'object' && value !== null && 'access' in value;
}
