import { hc } from 'hono/client';
import type { AppType } from '../worker/app.ts';

// The one typed client for the Worker's API, shared by every tab.
export const client = hc<AppType>('/');

// Throws on anything but a success, so the caller reads the body of the route's own
// response and never a problem's.
export function expectOk<R extends { ok: boolean; status: number }>(
  response: R,
  call: string,
): asserts response is R & { ok: true } {
  if (!response.ok) throw new Error(`${call} answered ${String(response.status)}`);
}
