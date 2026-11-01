import type { DraftEntry, DraftItem, Preview } from '../worker/structure.ts';
import { client, expectOk } from './api.ts';

export type { DraftItem, Preview };

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
