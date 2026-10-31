import { parse as parseCookie } from 'hono/utils/cookie';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type Identity = { readonly email: string };

export type AccessConfig = {
  readonly teamDomain: string;
  readonly aud: string;
};

export type AccessContext = Pick<ExecutionContext, 'access'>;

export type IdentityResolver = (
  request: Request,
  config: AccessConfig,
  ctx: AccessContext | undefined,
) => Promise<Identity | undefined>;

const ASSERTION_HEADER = 'cf-access-jwt-assertion';
const ASSERTION_COOKIE = 'CF_Authorization';

export function certificatesUrl(teamDomain: string): URL {
  return new URL(`https://${teamDomain}/cdn-cgi/access/certs`);
}

export function issuer(teamDomain: string): string {
  return `https://${teamDomain}`;
}

const remoteKeySets = new Map<string, JWTVerifyGetKey>();

// One key set per team domain for the life of the isolate, so the certificates are
// fetched once and not on every request.
function remoteKeys(teamDomain: string): JWTVerifyGetKey {
  const cached = remoteKeySets.get(teamDomain);
  if (cached !== undefined) return cached;
  const keys = createRemoteJWKSet(certificatesUrl(teamDomain));
  remoteKeySets.set(teamDomain, keys);
  return keys;
}

// Reads who Cloudflare Access let in. The Access binding on the execution context is
// the first source; when the application is matched by hostname instead of a binding,
// the identity comes from the JWT that Access attaches to the request.
export function accessIdentity(
  keysFor: (teamDomain: string) => JWTVerifyGetKey = remoteKeys,
): IdentityResolver {
  return async (request, config, ctx) => {
    const bound = await ctx?.access?.getIdentity();
    if (typeof bound?.email === 'string') return { email: bound.email };

    const token = assertion(request);
    if (token === undefined) return undefined;
    return verifyAssertion(token, config, keysFor(config.teamDomain));
  };
}

async function verifyAssertion(
  token: string,
  config: AccessConfig,
  keys: JWTVerifyGetKey,
): Promise<Identity | undefined> {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: issuer(config.teamDomain),
      audience: config.aud,
    });
    return typeof payload.email === 'string' ? { email: payload.email } : undefined;
  } catch (error) {
    // An expired, forged or foreign token is a request without an identity, not a crash.
    if (error instanceof errors.JOSEError) return undefined;
    throw error;
  }
}

function assertion(request: Request): string | undefined {
  const header = request.headers.get(ASSERTION_HEADER);
  if (header !== null && header !== '') return header;
  const cookies = request.headers.get('cookie');
  if (cookies === null) return undefined;
  const token = parseCookie(cookies, ASSERTION_COOKIE)[ASSERTION_COOKIE];
  return token === undefined || token === '' ? undefined : token;
}
