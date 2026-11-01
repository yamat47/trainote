import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Database } from './db/index.ts';
import { CATEGORIES, ENTRY_KINDS, type MessageRole } from './db/schema.ts';
import { entriesBetween, type Entry } from './entries.ts';
import { readFullProfile, type FullProfile } from './profile.ts';
import { daysBetween, tokyoDate, type DayRange } from './week.ts';
import { weightsBetween } from './weights.ts';

// One message of the thread as the coach reads it.
export type Turn = { role: MessageRole; content: string };

// What the coach sends while answering: the reply as it is written, and the notice that
// it is reading the records in between.
export type CoachEvent = { type: 'text'; text: string } | { type: 'reading' };
export type Emit = (event: CoachEvent) => Promise<void>;

// A thread to answer: its messages so far, and where the person's records are.
export type Consultation = { db: Database; userId: number; history: Turn[]; now: Date };

// Answers the thread, sending each piece as it is written, and resolves to the whole
// reply, or throws a CoachError.
export type Coach = (env: Env, consultation: Consultation, emit: Emit) => Promise<string>;

// Why no reply came. All are "could not reach your coach" to the page; the reason and
// the cause are for the log the route writes.
export type Reason = 'refused' | 'cut' | 'unavailable' | 'silent' | 'failed';

export class CoachError extends Error {
  readonly reason: Reason;

  constructor(reason: Reason, options?: ErrorOptions) {
    super(`the coach could not answer: ${reason}`, options);
    this.name = 'CoachError';
    this.reason = reason;
  }
}

const INSTRUCTIONS = `You are the coach in trainote, a personal body-make journal with a single owner. They write down what they did as entries, each a win (an effort toward the body they want: a workout, a snack resisted, an early night) or a slip (a lapse: a skipped session, sweets, a late night), in the categories exercise, food, sleep and life; a workout entry can carry its exercises with weight, reps, sets, minutes or distance. They also weigh in, with body fat when they have it, and they come here to talk it over.

Coach toward the body they want through both training and eating. Read what they managed and where they slipped, and advise on both exercise and food from that. A slip is a single slip, never a failure, so name it without blame. Be concrete: the exercise and the weight, the meal, the hour. Prefer one next step over a list of them.

Read their entries and weights with the tools before you speak about them, and never guess a number. When they ask for the week's review, read this week from Monday to today and the week before it for comparison, then say what went well, where they slipped, and one direction for next week.

Answer in the language they write in, in a few short paragraphs, without headings, bullet points or emoji: the reply is a chat bubble on a phone.`;

const line = (label: string, value: string | number | null, unit = '') =>
  value === null ? undefined : `- ${label}: ${String(value)}${unit}`;

// The profile as lines of the prompt, the filled-in fields only.
export function profileLines(profile: FullProfile | undefined): string[] {
  if (profile === undefined) return [];
  return [
    line('Height', profile.heightCm, ' cm'),
    line('Birth year', profile.birthYear),
    line('Sex', profile.sex),
    line('Goal weight', profile.goalWeightKg, ' kg'),
    line('Goal deadline', profile.goalDeadline),
    line('Trains at', profile.trainingPlace),
    line('Equipment', profile.equipment),
    line('Sessions per week', profile.weeklySessions),
    line('Constraints', profile.constraints),
  ].filter((entry) => entry !== undefined);
}

// What changes from day to day and with the profile, kept out of the cached block.
export function situation(profile: FullProfile | undefined, today: string): string {
  const lines = profileLines(profile);
  const about =
    lines.length === 0
      ? 'They have not filled in their profile yet.'
      : `Their profile:\n${lines.join('\n')}`;
  return `Today is ${today} in Asia/Tokyo, the zone every date here is in; a week runs Monday to Sunday.\n\n${about}`;
}

// About twenty minutes of conversation; a thread rarely gets there, and the owner pays
// per token read.
const MAX_HISTORY_CHARS = 30_000;

// The messages Claude is sent: the whole thread while it fits the budget, else its tail,
// cut at a message of the person's so the thread still opens with them. The last message
// always goes, whatever its length.
export function trimmed(history: Turn[], budget = MAX_HISTORY_CHARS): Turn[] {
  let left = budget;
  let kept = 0;
  for (const turn of history.toReversed()) {
    if (kept > 0 && turn.content.length > left) break;
    left -= turn.content.length;
    kept += 1;
  }
  const tail = history.slice(history.length - kept);
  const first = tail.findIndex((turn) => turn.role === 'user');
  return first <= 0 ? tail : tail.slice(first);
}

const Range = z.object({
  from: z.iso.date().describe('The first day, YYYY-MM-DD'),
  to: z.iso.date().describe('The last day, inclusive, YYYY-MM-DD'),
});
const EntriesInput = Range.extend({
  kind: z.enum(ENTRY_KINDS).optional(),
  category: z.enum(CATEGORIES).optional(),
});

const MAX_RANGE_DAYS = 366;
// A year of daily notes is a few hundred rows; past that the model asked for too much.
const MAX_ROWS = 400;

const rangeFault = ({ from, to }: DayRange) =>
  from > to || daysBetween(from, to) > MAX_RANGE_DAYS
    ? 'The range must run forward and span a year at most.'
    : undefined;

// A tool result: the rows as JSON, saying how many were left out when they were.
function listed(rows: object[]): string {
  const shown = rows.slice(0, MAX_ROWS);
  const leftOut = rows.length - shown.length;
  return JSON.stringify(leftOut === 0 ? { rows: shown } : { rows: shown, left_out: leftOut });
}

// The numbers a note did not give are left out rather than sent as null.
const withoutNulls = (row: Record<string, string | number | null>) =>
  Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null));

const compactEntry = ({ date, kind, category, body, items }: Entry) => ({
  date,
  kind,
  category,
  body,
  ...(items.length === 0
    ? {}
    : {
        exercises: items.map(({ exercise, weightKg, reps, sets, durationMin, distanceKm }) =>
          withoutNulls({ exercise, weightKg, reps, sets, durationMin, distanceKm }),
        ),
      }),
});

// The read-only tools; v1 has no writing tool by decision (docs/requirements.md). Their
// inputs are a few dates, so nothing is gained by streaming them early and the API keeps
// validating them (eager_input_streaming stays off).
function tools(db: Database, userId: number) {
  return [
    betaZodTool({
      name: 'read_entries',
      description:
        "The owner's entries from one day to another, oldest first: date, kind (win or slip), category, the body in their words, and the exercises of a workout. Narrow to a kind or a category when only one matters.",
      inputSchema: EntriesInput,
      run: async (input) =>
        rangeFault(input) ?? listed((await entriesBetween(db, userId, input)).map(compactEntry)),
    }),
    betaZodTool({
      name: 'read_weights',
      description:
        "The owner's weigh-ins from one day to another, oldest first: date, weight in kg, and body fat in percent when measured. One per day at most.",
      inputSchema: Range,
      run: async (input) =>
        rangeFault(input) ?? listed((await weightsBetween(db, userId, input)).map(withoutNulls)),
    }),
  ];
}

// Room for the thinking the model does before a reply of a few paragraphs; it cannot be
// turned off on this model and counts toward the limit.
const MAX_REPLY_TOKENS = 16_000;
// Rounds of tool calls before the model has to answer with what it read.
const MAX_ROUNDS = 8;

export function coachWithClaude(fetch: typeof globalThis.fetch = globalThis.fetch): Coach {
  return async (env, { db, userId, history, now }, emit) => {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, fetch });
    const profile = await readFullProfile(db, userId);
    const runner = client.beta.messages.toolRunner({
      model: env.COACH_MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      // The breakpoint after the instructions caches them with the tools, for the next
      // round of this answer and for every answer after it; what follows changes.
      system: [
        { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: situation(profile, tokyoDate(now)) },
      ],
      tools: tools(db, userId),
      messages: trimmed(history).map(({ role, content }) => ({ role, content })),
      stream: true,
      max_iterations: MAX_ROUNDS,
      // The whole history goes with every round, as the decision says, rather than the
      // SDK's default of a server-side message thread that is sent only the new turns.
      thread: false,
    });

    let reply = '';
    // Text written before a round of tools and text written after it are paragraphs apart.
    let gap = '';
    let last: BetaMessage | undefined;
    try {
      /* eslint-disable no-await-in-loop -- the events of a reply leave in order, and the
         next round's request carries this round's tool results */
      for await (const stream of runner) {
        for await (const event of stream) {
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            await emit({ type: 'reading' });
          }
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = gap + event.delta.text;
            gap = '';
            reply += text;
            await emit({ type: 'text', text });
          }
        }
        last = await stream.finalMessage();
        // What each round cost, and whether the cached block was read.
        console.info('coach round', last.usage);
        if (last.stop_reason === 'refusal') throw new CoachError('refused');
        if (
          last.stop_reason === 'max_tokens' ||
          last.stop_reason === 'model_context_window_exceeded'
        ) {
          throw new CoachError('cut');
        }
        if (reply !== '') gap = '\n\n';
      }
      /* eslint-enable no-await-in-loop */
    } catch (error) {
      // The SDK throws an APIError for a timeout, a dropped connection and every non-2xx
      // answer.
      if (error instanceof APIError) throw new CoachError('unavailable', { cause: error });
      throw error;
    }
    // The runner stops without another request once the rounds are used up, so a reply
    // still asking for tools is as cut off as one that hit max_tokens.
    if (last?.stop_reason === 'tool_use') throw new CoachError('cut');
    if (reply.trim() === '') throw new CoachError('silent');
    return reply;
  };
}
