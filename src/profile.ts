import { MAX_WEIGHT_KG, parseMeasurement } from '../worker/measurement.ts';
import type { Goal, Profile } from '../worker/profile.ts';
import { client, expectOk } from './api.ts';

export type { Goal, Profile };

export async function loadProfile(): Promise<Profile> {
  const response = await client.api.profile.$get();
  expectOk(response, 'GET /api/profile');
  return response.json();
}

// The goal as the two rows hold it; a second save replaces the first.
export async function saveGoal(request: Goal): Promise<Profile> {
  const response = await client.api.profile.goal.$put({ json: request });
  expectOk(response, 'PUT /api/profile/goal');
  return response.json();
}

// The request the two goal rows make, or nothing while a written weight is not one. An
// empty row clears that part of the goal; the date control yields YYYY-MM-DD or nothing.
export function goal(weight: string, deadline: string): Goal | undefined {
  const goalWeightKg = weight.trim() === '' ? null : parseMeasurement(weight, MAX_WEIGHT_KG);
  if (goalWeightKg === undefined) return undefined;
  return { goalWeightKg, goalDeadline: deadline === '' ? null : deadline };
}

// The goal rows as the stored profile fills them.
export const goalFields = (profile: Profile) => ({
  weight: profile.goalWeightKg === null ? '' : profile.goalWeightKg.toFixed(1),
  deadline: profile.goalDeadline ?? '',
});
