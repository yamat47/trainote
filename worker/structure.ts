import Anthropic, { AnthropicError, APIError } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { CATEGORIES, ENTRY_KINDS } from './db/schema.ts';

// What Claude reads out of one note. Structured Outputs wants every property present, so
// a number the note does not give is null rather than absent.
export const DraftItem = z.object({
  exercise: z.string().describe('The exercise, normalized to its full common name'),
  weightKg: z.number().nullable(),
  reps: z.number().int().nullable(),
  sets: z.number().int().nullable(),
  durationMin: z.number().nullable(),
  distanceKm: z.number().nullable(),
});
export type DraftItem = z.infer<typeof DraftItem>;

export const DraftEntry = z.object({
  kind: z.enum(ENTRY_KINDS),
  category: z.enum(CATEGORIES),
  body: z.string().min(1),
  items: z.array(DraftItem),
});
export type DraftEntry = z.infer<typeof DraftEntry>;

export const Preview = z.object({
  entries: z.array(DraftEntry),
  comment: z.string(),
});
export type Preview = z.infer<typeof Preview>;

export type Structure = (env: Env, text: string) => Promise<Preview>;

// Why a note came back without a preview. All three are "could not read it now" to the
// page; the reason and the cause are for the log the route writes.
type Reason = 'refused' | 'unparsed' | 'unavailable';

export class StructureError extends Error {
  readonly reason: Reason;

  constructor(reason: Reason, options?: ErrorOptions) {
    super(`the note could not be structured: ${reason}`, options);
    this.name = 'StructureError';
    this.reason = reason;
  }
}

const INSTRUCTIONS = `You read one note that the owner of trainote, a personal body-make journal, wrote about what they did. Split it into separate acts and return them as entries.

Each entry is one act. Its kind is "win" when the act was an effort toward their body-make goal (training, resisting a snack, sleeping early) and "slip" when it was a lapse (skipping the gym, eating sweets, staying up late). A slip is a single slip, never a failure; describe it without blame. Its category is "exercise", "food", "sleep" or "life".

The body is the act in the writer's own words and language, trimmed to a few words. Leave out the numbers you move into items, and add nothing the note does not say. Never merge two acts into one entry.

Items are for exercise only. Give one item per line of numbers as the note states them: "60kg 10回 3セット" is one item with weightKg 60, reps 10 and sets 3; "60kg で 10、8、6" is three items with reps 10, 8 and 6 and sets null; a run of 2.5 km is one item with distanceKm 2.5. Normalize the exercise to its full common name in the note's language, so "ベンチ" becomes "ベンチプレス". A note like "ジム行った" has no numbers and gets no items.

The comment is a single short sentence to the writer in the language of the note, ending at its first full stop: warm, specific to this note, and never advice. If the note records nothing, return no entries and say so in the comment.`;

const PREVIEW_FORMAT = zodOutputFormat(Preview);

// Low effort: this is extraction, and the preview has a three-second budget. No retry
// and a short timeout for the same reason: a slow call is not run twice behind the
// person's back; the page shows the failure and they tap again.
export function structureWithClaude(fetch: typeof globalThis.fetch = globalThis.fetch): Structure {
  return async (env, text) => {
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: 10_000,
      fetch,
    });
    try {
      const response = await client.messages.parse({
        model: env.STRUCTURE_MODEL,
        // Room for the longest preview a note of MAX_NOTE_LENGTH can produce (the 50
        // entries entries.ts accepts, at about 100 tokens each), so a cut-off answer is
        // never the reason a note cannot be read.
        max_tokens: 8192,
        system: INSTRUCTIONS,
        messages: [{ role: 'user', content: text }],
        output_config: { effort: 'low', format: PREVIEW_FORMAT },
      });
      if (response.stop_reason === 'refusal') throw new StructureError('refused');
      if (response.parsed_output === null) throw new StructureError('unparsed');
      return response.parsed_output;
    } catch (error) {
      // The SDK throws an APIError for a timeout, a dropped connection and every non-2xx
      // answer, and its base error, wrapping zod's, when the JSON is not the preview.
      if (error instanceof APIError) throw new StructureError('unavailable', { cause: error });
      if (error instanceof AnthropicError) throw new StructureError('unparsed', { cause: error });
      throw error;
    }
  };
}
