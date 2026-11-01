import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CoachError,
  coachWithClaude,
  profileLines,
  situation,
  trimmed,
  type CoachEvent,
  type Consultation,
  type Turn,
} from './coach.ts';
import { database } from './db/index.ts';
import { weights } from './db/schema.ts';
import { platform, userIdOf } from './test/platform.ts';

const turn = (role: Turn['role'], content: string): Turn => ({ role, content });

describe('trimmed', () => {
  it('sends the whole thread while it fits the budget', () => {
    const history = [turn('user', 'hi'), turn('assistant', 'hello'), turn('user', 'plan?')];
    expect(trimmed(history, 100)).toEqual(history);
  });

  it('keeps the tail that fits and opens it with a message of the person, never the coach', () => {
    const history = [
      turn('user', 'one'),
      turn('assistant', 'a'.repeat(10)),
      turn('user', 'b'.repeat(10)),
      turn('assistant', 'c'.repeat(10)),
      turn('user', 'd'.repeat(10)),
    ];
    // 42 characters fit the last four, but the first of them is the coach's.
    expect(trimmed(history, 42)).toEqual(history.slice(2));
  });

  it('always sends the last message, even one longer than the budget', () => {
    const history = [
      turn('user', 'short'),
      turn('assistant', 'a'.repeat(50)),
      turn('user', 'b'.repeat(50)),
    ];
    expect(trimmed(history, 10)).toEqual([history[2]]);
  });
});

describe('situation', () => {
  it('lists the filled-in profile fields with their units, and says so when there are none', () => {
    const lines = profileLines({
      userId: 1,
      heightCm: 172,
      birthYear: null,
      sex: null,
      goalWeightKg: 60,
      goalDeadline: '2027-03-31',
      trainingPlace: null,
      equipment: null,
      weeklySessions: 3,
      constraints: '右膝に古傷',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });
    expect(lines).toEqual([
      '- Height: 172 cm',
      '- Goal weight: 60 kg',
      '- Goal deadline: 2027-03-31',
      '- Sessions per week: 3',
      '- Constraints: 右膝に古傷',
    ]);
    expect(situation(undefined, '2026-11-01')).toMatch(
      /^Today is 2026-11-01 in Asia\/Tokyo.*\n\nThey have not filled in their profile yet\.$/,
    );
  });
});

// A Messages API stream as the SDK reads it: the message, its blocks, the stop reason.
type Event = { type: string } & Record<string, unknown>;

const sse = (events: Event[]) =>
  events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');

const opening: Event = {
  type: 'message_start',
  message: {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  },
};

const textBlock = (index: number, ...parts: string[]): Event[] => [
  { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
  ...parts.map((text) => ({
    type: 'content_block_delta',
    index,
    delta: { type: 'text_delta', text },
  })),
  { type: 'content_block_stop', index },
];

const toolBlock = (index: number, name: string, input: object): Event[] => [
  {
    type: 'content_block_start',
    index,
    content_block: { type: 'tool_use', id: `toolu_${String(index)}`, name, input: {} },
  },
  {
    type: 'content_block_delta',
    index,
    delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) },
  },
  { type: 'content_block_stop', index },
];

const ending = (stopReason: string): Event[] => [
  { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: {} },
  { type: 'message_stop' },
];

const reply = (events: Event[], stopReason: string) => () =>
  new Response(sse([opening, ...events, ...ending(stopReason)]), {
    headers: { 'content-type': 'text/event-stream' },
  });

const refused = () =>
  new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error' } }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });

type Sent = Record<string, unknown>;

const isRecord = (value: unknown): value is Sent => typeof value === 'object' && value !== null;

// A fetch that answers the requests in turn, repeating the last answer, and keeps what
// each request carried.
function fakeFetch(answers: (() => Response)[]) {
  const sent: Sent[] = [];
  const fetch: typeof globalThis.fetch = (_input, init) => {
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    sent.push(isRecord(body) ? body : {});
    const answer = answers[Math.min(sent.length, answers.length) - 1];
    if (answer === undefined) throw new Error('no answer prepared');
    return Promise.resolve(answer());
  };
  return { fetch, sent };
}

const WEEK = { from: '2026-10-26', to: '2026-11-01' };

describe('coachWithClaude', () => {
  let proxy: PlatformProxy<Env>;
  let env: Env;
  let consultation: Consultation;

  beforeAll(async () => {
    proxy = await platform();
    // The key never leaves the fake fetch, and CI has no .dev.vars to read one from.
    env = { ...proxy.env, ANTHROPIC_API_KEY: 'test-key' };
    const userId = await userIdOf(proxy.env, 'coach@example.com');
    await database(proxy.env.DB)
      .insert(weights)
      .values({ userId, date: '2026-10-30', weightKg: 64.2, bodyFatPct: null });
    consultation = {
      db: database(proxy.env.DB),
      userId,
      history: [turn('user', '今週は？')],
      now: new Date('2026-11-01T03:00:00Z'),
    };
  });

  afterAll(() => proxy.dispose());

  const ask = (answers: (() => Response)[]) => {
    const { fetch, sent } = fakeFetch(answers);
    const events: CoachEvent[] = [];
    const emit = (event: CoachEvent) => {
      events.push(event);
      return Promise.resolve();
    };
    const result = coachWithClaude(fetch)(env, consultation, emit);
    return { result, events, sent };
  };

  it('reads with a tool between two pieces of text, says so, and returns both a paragraph apart', async () => {
    const { result, events, sent } = ask([
      reply(
        [...textBlock(0, 'Let me ', 'look.'), ...toolBlock(1, 'read_weights', WEEK)],
        'tool_use',
      ),
      reply(textBlock(0, 'Down to 64.2 kg.'), 'end_turn'),
    ]);

    await expect(result).resolves.toBe('Let me look.\n\nDown to 64.2 kg.');
    expect(events).toEqual([
      { type: 'text', text: 'Let me ' },
      { type: 'text', text: 'look.' },
      { type: 'reading' },
      { type: 'text', text: '\n\nDown to 64.2 kg.' },
    ]);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      model: env.COACH_MODEL,
      system: [{ type: 'text', cache_control: { type: 'ephemeral' } }, { type: 'text' }],
      tools: [{ name: 'read_entries' }, { name: 'read_weights' }],
      messages: [{ role: 'user', content: '今週は？' }],
    });
    expect(JSON.stringify(sent[0]?.system)).toContain('Today is 2026-11-01 in Asia/Tokyo');
    // The second request carries the weight the tool read.
    expect(sent[1]).toMatchObject({
      messages: [
        { role: 'user' },
        { role: 'assistant' },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_1',
              content: JSON.stringify({ rows: [{ date: '2026-10-30', weightKg: 64.2 }] }),
            },
          ],
        },
      ],
    });
  });

  it.each([
    ['refused', 'a refusal', reply(textBlock(0, 'I'), 'refusal')],
    ['cut', 'a reply cut off at max_tokens', reply(textBlock(0, 'Long'), 'max_tokens')],
    ['silent', 'a reply with no text', reply([], 'end_turn')],
    ['unavailable', 'an API error', refused],
  ] as const)('throws %s on %s and stores nothing of it', async (reason, _case, answer) => {
    const { result } = ask([answer]);

    await expect(result).rejects.toMatchObject({ name: 'CoachError', reason });
  });

  it('throws cut when the rounds of tools run out without an answer', async () => {
    const { result, sent } = ask([reply(toolBlock(0, 'read_weights', WEEK), 'tool_use')]);

    await expect(result).rejects.toBeInstanceOf(CoachError);
    await expect(result).rejects.toMatchObject({ reason: 'cut' });
    expect(sent).toHaveLength(8);
  });
});
