import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// RFC 9457 problem details.
export function problem(c: Context, status: ContentfulStatusCode, title: string) {
  return c.body(JSON.stringify({ type: 'about:blank', title, status }), status, {
    'content-type': 'application/problem+json',
  });
}
