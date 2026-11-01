import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StructureError, structureWithClaude } from './structure.ts';
import { platform } from './test/platform.ts';
import { NOTE, PREVIEW } from './test/preview.ts';

// The shape of a Messages API answer, as far as the SDK's parser reads it.
const answer = (content: unknown[], stopReason = 'end_turn') =>
  new Response(
    JSON.stringify({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-5-5',
      content,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    { headers: { 'content-type': 'application/json' } },
  );

type Captured = { url: string; body: unknown };

// A fetch that answers every request the same way and keeps what was sent.
function fakeFetch(response: () => Response) {
  const calls: Captured[] = [];
  const fetch: typeof globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    return Promise.resolve(response());
  };
  return { fetch, calls };
}

describe('structureWithClaude', () => {
  let proxy: PlatformProxy<Env>;
  let env: Env;

  beforeAll(async () => {
    proxy = await platform();
    // The key never leaves the fake fetch, and CI has no .dev.vars to read one from.
    env = { ...proxy.env, ANTHROPIC_API_KEY: 'test-key' };
  });

  afterAll(() => proxy.dispose());

  it('asks the configured model for the preview as JSON and returns it parsed', async () => {
    const { fetch, calls } = fakeFetch(() =>
      answer([{ type: 'text', text: JSON.stringify(PREVIEW) }]),
    );

    const result = await structureWithClaude(fetch)(env, NOTE);

    expect(result).toEqual(PREVIEW);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.anthropic.com/v1/messages');
    expect(calls[0]?.body).toMatchObject({
      model: env.STRUCTURE_MODEL,
      messages: [{ role: 'user', content: NOTE }],
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: { required: ['entries', 'comment'] } },
      },
    });
  });

  it('throws a refusal when the model declines the note', async () => {
    const { fetch } = fakeFetch(() => answer([], 'refusal'));

    await expect(structureWithClaude(fetch)(env, 'a note')).rejects.toMatchObject({
      name: 'StructureError',
      reason: 'refused',
    });
  });

  it('throws when the answer carries no preview', async () => {
    const { fetch } = fakeFetch(() => answer([]));

    await expect(structureWithClaude(fetch)(env, 'a note')).rejects.toMatchObject({
      name: 'StructureError',
      reason: 'unparsed',
    });
  });

  it('throws when the answer is JSON but not the preview', async () => {
    const { fetch } = fakeFetch(() =>
      answer([{ type: 'text', text: JSON.stringify({ entries: [{ kind: 'maybe' }] }) }]),
    );

    await expect(structureWithClaude(fetch)(env, 'a note')).rejects.toMatchObject({
      name: 'StructureError',
      reason: 'unparsed',
    });
  });

  it('throws when the API is down, without retrying', async () => {
    const { fetch, calls } = fakeFetch(
      () =>
        new Response(JSON.stringify({ type: 'error', error: { type: 'overloaded_error' } }), {
          status: 529,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(structureWithClaude(fetch)(env, 'a note')).rejects.toBeInstanceOf(StructureError);
    expect(calls).toHaveLength(1);
  });
});
