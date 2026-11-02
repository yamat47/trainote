import { hc } from 'hono/client';
import type { AppType } from '../worker/app.ts';

// The one typed client for the Worker's API, shared by every tab. Its base is the page's
// origin rather than `/`: a request takes either, but a route's URL (`$url`, which the
// Coach's answer stream is fetched at) is built from an absolute base only.
export const client = hc<AppType>(location.origin);

// The path parameter that names a row of a collection.
export const param = (id: number) => ({ param: { id: String(id) } });

// Throws on anything but a success, so the caller reads the body of the route's own
// response and never a problem's.
export function expectOk<R extends { ok: boolean; status: number }>(
  response: R,
  call: string,
): asserts response is R & { ok: true } {
  if (!response.ok) throw new Error(`${call} answered ${String(response.status)}`);
}
