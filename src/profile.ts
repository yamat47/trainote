import { MAX_WEIGHT_KG, parseMeasurement } from '../worker/measurement.ts';
import {
  MAX_COACH_NOTES_LENGTH,
  MAX_EQUIPMENT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  MAX_WEEKLY_SESSIONS,
  MIN_BIRTH_YEAR,
  parseHeight,
  parseText,
  parseWhole,
  thisYear,
} from '../worker/profile-fields.ts';
import type { About, CoachNotes, Goal, Profile, Training } from '../worker/profile.ts';
import { client, expectOk } from './api.ts';

export type { About, CoachNotes, Goal, Profile, Training };

export async function loadProfile(): Promise<Profile> {
  const response = await client.api.profile.$get();
  expectOk(response, 'GET /api/profile');
  return response.json();
}

// Each group is saved whole, and a second save replaces the first. The server answers the
// whole profile; only the saved group's fields are kept from it, since two groups can be
// saving at once and the later answer would bring back the other group's older values.
export async function saveAbout(request: About): Promise<About> {
  const response = await client.api.profile.about.$put({ json: request });
  expectOk(response, 'PUT /api/profile/about');
  const { heightCm, birthYear, sex } = await response.json();
  return { heightCm, birthYear, sex };
}

export async function saveGoal(request: Goal): Promise<Goal> {
  const response = await client.api.profile.goal.$put({ json: request });
  expectOk(response, 'PUT /api/profile/goal');
  const { goalWeightKg, goalDeadline } = await response.json();
  return { goalWeightKg, goalDeadline };
}

export async function saveTraining(request: Training): Promise<Training> {
  const response = await client.api.profile.training.$put({ json: request });
  expectOk(response, 'PUT /api/profile/training');
  const { trainingPlace, weeklySessions, equipment } = await response.json();
  return { trainingPlace, weeklySessions, equipment };
}

export async function saveNotes(request: CoachNotes): Promise<CoachNotes> {
  const response = await client.api.profile.notes.$put({ json: request });
  expectOk(response, 'PUT /api/profile/notes');
  const { constraints } = await response.json();
  return { constraints };
}

// A stored number in its field, "" when there is none.
const numberText = (n: number | null) => (n === null ? '' : String(n));

// The request the About you rows make, or nothing while one of them holds what the server
// would refuse. An empty row clears that field.
export function about(height: string, born: string, sex: string): About | undefined {
  const heightCm = parseHeight(height);
  const birthYear = parseWhole(born, MIN_BIRTH_YEAR, thisYear(new Date()));
  const word = parseText(sex, MAX_SHORT_TEXT_LENGTH);
  if (heightCm === undefined || birthYear === undefined || word === undefined) return undefined;
  return { heightCm, birthYear, sex: word };
}

export const aboutFields = (profile: Profile) => ({
  height: numberText(profile.heightCm),
  born: numberText(profile.birthYear),
  sex: profile.sex ?? '',
});

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

export function training(where: string, days: string, equipment: string): Training | undefined {
  const trainingPlace = parseText(where, MAX_SHORT_TEXT_LENGTH);
  const weeklySessions = parseWhole(days, 0, MAX_WEEKLY_SESSIONS);
  const kit = parseText(equipment, MAX_EQUIPMENT_LENGTH);
  if (trainingPlace === undefined || weeklySessions === undefined || kit === undefined) {
    return undefined;
  }
  return { trainingPlace, weeklySessions, equipment: kit };
}

export const trainingFields = (profile: Profile) => ({
  where: profile.trainingPlace ?? '',
  days: numberText(profile.weeklySessions),
  equipment: profile.equipment ?? '',
});

export function coachNotes(notes: string): CoachNotes | undefined {
  const constraints = parseText(notes, MAX_COACH_NOTES_LENGTH);
  return constraints === undefined ? undefined : { constraints };
}

export const notesFields = (profile: Profile) => ({ notes: profile.constraints ?? '' });
