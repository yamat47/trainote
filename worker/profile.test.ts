import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { thisYear } from './profile-fields.ts';
import { clientAs, platform } from './test/platform.ts';

// The profile before anything is set, as the page reads it.
const EMPTY = {
  heightCm: null,
  birthYear: null,
  sex: null,
  goalWeightKg: null,
  goalDeadline: null,
  trainingPlace: null,
  weeklySessions: null,
  equipment: null,
  constraints: null,
};

const ABOUT = { heightCm: 172.5, birthYear: 1990, sex: 'Male' };
const TRAINING = { trainingPlace: 'Gym', weeklySessions: 3, equipment: 'バーベル、ダンベル' };
const NOTES = { constraints: '膝が弱いので深いスクワットは避ける。' };

describe('/api/profile', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  const api = (email: string) => clientAs(proxy.env, email).api.profile;

  it("reads an empty profile before anything is set, not another user's", async () => {
    await api('other-goal@example.com').goal.$put({
      json: { goalWeightKg: 70, goalDeadline: null },
    });
    const response = await api('blank@example.com').$get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(EMPTY);
  });

  it('stores the goal, replaces it on a second put, and clears it with nulls', async () => {
    const profile = api('goal@example.com');
    const first = await profile.goal.$put({
      json: { goalWeightKg: 60, goalDeadline: '2027-03-31' },
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ...EMPTY, goalWeightKg: 60, goalDeadline: '2027-03-31' });

    const second = await profile.goal.$put({ json: { goalWeightKg: 62.5, goalDeadline: null } });
    expect(await second.json()).toEqual({ ...EMPTY, goalWeightKg: 62.5 });
    const read = await profile.$get();
    expect(await read.json()).toEqual({ ...EMPTY, goalWeightKg: 62.5 });

    const cleared = await profile.goal.$put({ json: { goalWeightKg: null, goalDeadline: null } });
    expect(await cleared.json()).toEqual(EMPTY);
  });

  it('stores each group over the others, and clearing one leaves the rest', async () => {
    const profile = api('groups@example.com');
    expect((await profile.about.$put({ json: ABOUT })).status).toBe(200);
    expect((await profile.training.$put({ json: TRAINING })).status).toBe(200);
    const notes = await profile.notes.$put({ json: NOTES });
    expect(await notes.json()).toEqual({ ...EMPTY, ...ABOUT, ...TRAINING, ...NOTES });

    const cleared = await profile.about.$put({
      json: { heightCm: null, birthYear: null, sex: null },
    });
    expect(await cleared.json()).toEqual({ ...EMPTY, ...TRAINING, ...NOTES });
    expect(await (await profile.$get()).json()).toEqual({ ...EMPTY, ...TRAINING, ...NOTES });
  });

  it('stores text without the spaces around it, and a blank as nothing', async () => {
    const profile = api('text@example.com');
    const response = await profile.training.$put({
      json: { trainingPlace: '  Home  ', weeklySessions: 0, equipment: '   ' },
    });
    expect(await response.json()).toEqual({ ...EMPTY, trainingPlace: 'Home', weeklySessions: 0 });
  });

  it('takes this year as a birth year', async () => {
    const response = await api('born@example.com').about.$put({
      json: { heightCm: null, birthYear: thisYear(new Date()), sex: null },
    });
    expect(response.status).toBe(200);
  });

  it('refuses a deadline that is not a calendar day', async () => {
    const response = await api('baddate@example.com').goal.$put({
      json: { goalWeightKg: 60, goalDeadline: '2027-02-30' },
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
  });

  it('refuses a height or a birth year out of range, and a sex past 50 characters', async () => {
    const about = api('badabout@example.com').about;
    const bodies = [
      { ...ABOUT, heightCm: 49.9 },
      { ...ABOUT, heightCm: 250 },
      { ...ABOUT, heightCm: 172.25 },
      { ...ABOUT, birthYear: 1899 },
      { ...ABOUT, birthYear: thisYear(new Date()) + 1 },
      { ...ABOUT, birthYear: 1990.5 },
      { ...ABOUT, sex: 'x'.repeat(51) },
    ];
    const statuses = await Promise.all(
      bodies.map(async (json) => (await about.$put({ json })).status),
    );
    expect(statuses).toEqual(bodies.map(() => 400));
    expect(await (await api('badabout@example.com').$get()).json()).toEqual(EMPTY);
  });

  it('refuses sessions that are not 0 to 14 whole days, and text past its ceiling', async () => {
    const profile = api('badtraining@example.com');
    const trainings = [
      { ...TRAINING, weeklySessions: 15 },
      { ...TRAINING, weeklySessions: -1 },
      { ...TRAINING, weeklySessions: 2.5 },
      { ...TRAINING, trainingPlace: 'x'.repeat(51) },
      { ...TRAINING, equipment: 'x'.repeat(201) },
    ];
    const statuses = await Promise.all([
      ...trainings.map(async (json) => (await profile.training.$put({ json })).status),
      profile.notes
        .$put({ json: { constraints: 'x'.repeat(2001) } })
        .then((response) => response.status),
    ]);
    expect(statuses).toEqual([...trainings.map(() => 400), 400]);
  });
});
