import type { Entry, Week } from '../worker/entries.ts';
import type { DraftEntry, DraftItem, Preview } from '../worker/structure.ts';
import { client, expectOk } from './api.ts';

export type { DraftItem, Entry, Preview, Week };

// Claude's reading of the note, shown before anything is stored.
export async function previewNote(text: string): Promise<Preview> {
  const response = await client.api.entries.preview.$post({ json: { text } });
  expectOk(response, 'POST /api/entries/preview');
  return response.json();
}

// The previewed entries, stored as they were shown.
export async function saveEntries(entries: DraftEntry[]): Promise<void> {
  const response = await client.api.entries.$post({ json: { entries } });
  expectOk(response, 'POST /api/entries');
}

export type Notes = { entries: Entry[]; week: Week };

// Everything the tab shows: the entries newest first, and this week's counts with the
// run of days written.
export async function loadNotes(): Promise<Notes> {
  const [listed, week] = await Promise.all([
    client.api.entries.$get(),
    client.api.entries.week.$get(),
  ]);
  expectOk(listed, 'GET /api/entries');
  expectOk(week, 'GET /api/entries/week');
  return { entries: (await listed.json()).entries, week: await week.json() };
}
