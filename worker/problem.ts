import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// RFC 9457 problem details. The status stays a literal so the typed client can tell a
// problem from the route's own response by `ok`.
export function problem<S extends ContentfulStatusCode>(c: Context, status: S, title: string) {
  return c.body(JSON.stringify({ type: 'about:blank', title, status }), status, {
    'content-type': 'application/problem+json',
  });
}
