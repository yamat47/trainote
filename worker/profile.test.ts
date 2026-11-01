import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clientAs, platform } from './test/platform.ts';

describe('/api/profile', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  it("reads an empty profile before anything is set, not another user's", async () => {
    await clientAs(proxy.env, 'other-goal@example.com').api.profile.goal.$put({
      json: { goalWeightKg: 70, goalDeadline: null },
    });
    const response = await clientAs(proxy.env, 'blank@example.com').api.profile.$get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ goalWeightKg: null, goalDeadline: null });
  });

  it('stores the goal, replaces it on a second put, and clears it with nulls', async () => {
    const api = clientAs(proxy.env, 'goal@example.com').api.profile;
    const first = await api.goal.$put({ json: { goalWeightKg: 60, goalDeadline: '2027-03-31' } });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ goalWeightKg: 60, goalDeadline: '2027-03-31' });

    const second = await api.goal.$put({ json: { goalWeightKg: 62.5, goalDeadline: null } });
    expect(await second.json()).toEqual({ goalWeightKg: 62.5, goalDeadline: null });
    const read = await api.$get();
    expect(await read.json()).toEqual({ goalWeightKg: 62.5, goalDeadline: null });

    const cleared = await api.goal.$put({ json: { goalWeightKg: null, goalDeadline: null } });
    expect(await cleared.json()).toEqual({ goalWeightKg: null, goalDeadline: null });
  });

  it('refuses a deadline that is not a calendar day', async () => {
    const api = clientAs(proxy.env, 'baddate@example.com').api.profile;
    const response = await api.goal.$put({
      json: { goalWeightKg: 60, goalDeadline: '2027-02-30' },
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
  });
});
