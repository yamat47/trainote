import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clientAs, platform } from './test/platform.ts';

describe('GET /api/me', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  it('creates the user on first sight and returns the same row afterwards', async () => {
    const client = clientAs(proxy.env, 'first@example.com');

    const first = await client.api.me.$get();
    const again = await client.api.me.$get();

    expect(first.status).toBe(200);
    const created = await first.json();
    expect(created).toMatchObject({ email: 'first@example.com' });
    expect(await again.json()).toEqual(created);
  });

  it('gives each email its own user', async () => {
    const one = await (await clientAs(proxy.env, 'one@example.com').api.me.$get()).json();
    const two = await (await clientAs(proxy.env, 'two@example.com').api.me.$get()).json();

    expect(one.email).toBe('one@example.com');
    expect(two.email).toBe('two@example.com');
    expect(one.id).not.toBe(two.id);
  });

  it('answers 401 as problem details when Access gave no identity', async () => {
    const response = await clientAs(proxy.env, undefined).api.me.$get();

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(await response.json()).toEqual({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
    });
  });
});
