import type { Entry, Week } from '../worker/entries.ts';
import type { DraftEntry, DraftItem, Preview } from '../worker/structure.ts';
import { client, expectOk, param } from './api.ts';

export type { DraftItem, Entry, Preview, Week };

// Claude's reading of the note, shown before anything is stored.
export async function previewNote(text: string): Promise<Preview> {
  const response = await client.api.entries.preview.$post({ json: { text } });
  expectOk(response, 'POST /api/entries/preview');
  return response.json();
}

// Claude's reading of a saved entry's rewritten text, as the one entry it becomes.
export async function previewEntry(text: string): Promise<Preview> {
  const response = await client.api.entries.preview.$post({ json: { text, single: true } });
  expectOk(response, 'POST /api/entries/preview');
  return response.json();
}

// A saved entry replaced by the reading of its rewritten text, on the day it belongs to.
export async function replaceEntry(id: number, entry: DraftEntry): Promise<Entry> {
  const response = await client.api.entries[':id'].$put({ ...param(id), json: entry });
  expectOk(response, 'PUT /api/entries/:id');
  return (await response.json()).entry;
}

export async function deleteEntry(id: number): Promise<void> {
  const response = await client.api.entries[':id'].$delete(param(id));
  expectOk(response, 'DELETE /api/entries/:id');
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
