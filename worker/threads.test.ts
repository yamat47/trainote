import { eq } from 'drizzle-orm';
import type { PlatformProxy } from 'wrangler';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CoachError, type Coach, type Consultation } from './coach.ts';
import { database } from './db/index.ts';
import { messages } from './db/schema.ts';
import { clientAs, platform, userIdOf } from './test/platform.ts';
import { WEEKLY_REVIEW_OPENING, type Conversation } from './threads.ts';

type Frame = { event: string; data: unknown };

// Narrows the problem responses away, so the body of the route's own response is typed.
function expectOk<R extends { ok: boolean; status: number }>(
  response: R,
): asserts response is R & { ok: true } {
  if (!response.ok) throw new Error(`answered ${String(response.status)}`);
}

// The frames of an SSE body: `event:` and `data:` lines, blank-line separated.
const frames = (body: string): Frame[] =>
  body
    .split('\n\n')
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const lines = block.split('\n');
      const event = lines.find((l) => l.startsWith('event: '))?.slice('event: '.length) ?? '';
      const data = lines
        .filter((l) => l.startsWith('data: '))
        .map((l) => l.slice('data: '.length))
        .join('\n');
      return { event, data: JSON.parse(data) as unknown };
    });

// A coach that says one word and then fails.
const failing: Coach = async (_env, _consultation, emit) => {
  await emit({ type: 'text', text: 'Well' });
  throw new CoachError('unavailable');
};

// A coach that reads once, then says two words, and keeps what it was asked.
const consulted: Consultation[] = [];
const twoWords: Coach = async (_env, consultation, emit) => {
  consulted.push(consultation);
  await emit({ type: 'reading' });
  await emit({ type: 'text', text: 'Nice' });
  await emit({ type: 'text', text: ' start.' });
  return 'Nice start.';
};

// The path parameter that names a conversation's thread.
const idOf = ({ thread }: Conversation) => ({ param: { id: String(thread.id) } });

describe('/api/threads', () => {
  let proxy: PlatformProxy<Env>;

  beforeAll(async () => {
    proxy = await platform();
  });

  afterAll(() => proxy.dispose());

  const api = (email: string, coach?: Coach) => clientAs(proxy.env, email, { coach }).api.threads;

  const start = async (email: string, text: string): Promise<Conversation> => {
    const response = await api(email).$post({ json: { text } });
    expect(response.status).toBe(201);
    expectOk(response);
    return response.json();
  };

  const storedMessages = (threadId: number) =>
    database(proxy.env.DB)
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.id);

  describe('POST /', () => {
    it('starts a chat titled from the first line of the message, which is its first message', async () => {
      // The first line is 43 characters; the title keeps 39 and an ellipsis.
      const text = ` \n脚の日のメニューを考えて。スクワットは 80 kg × 8 × 3 まで上がったところ\n二行目`;
      const response = await api('start@example.com').$post({ json: { text } });

      expect(response.status).toBe(201);
      expectOk(response);
      const { thread, messages: list } = await response.json();
      expect(response.headers.get('location')).toBe(`/api/threads/${String(thread.id)}`);
      expect(thread).toMatchObject({
        kind: 'chat',
        title: '脚の日のメニューを考えて。スクワットは 80 kg × 8 × 3 まで上がっ…',
      });
      expect(list.map((m) => [m.role, m.content])).toEqual([['user', text.trim()]]);
    });

    it('opens the weekly review with its fixed opening, and reopens the same one later that day', async () => {
      const first = await api('review@example.com').$post({ json: { kind: 'weekly-review' } });
      const again = await api('review@example.com').$post({ json: { kind: 'weekly-review' } });

      expect(first.status).toBe(201);
      expect(again.status).toBe(200);
      expectOk(first);
      expectOk(again);
      const opened = await first.json();
      expect(opened.thread).toMatchObject({ kind: 'weekly-review', title: 'Weekly review' });
      expect(opened.messages.map((m) => [m.role, m.content])).toEqual([
        ['user', WEEKLY_REVIEW_OPENING],
      ]);
      expect((await again.json()).thread.id).toBe(opened.thread.id);
    });

    it('refuses a blank message', async () => {
      const response = await api('blank@example.com').$post({ json: { text: ' \n ' } });

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
    });
  });

  describe('GET /', () => {
    it("lists the caller's threads, latest message first, each with the first line of the coach's last reply", async () => {
      const older = await start('list@example.com', 'older');
      const newer = await start('list@example.com', 'newer');
      await start('other-list@example.com', 'not mine');
      await database(proxy.env.DB)
        .insert(messages)
        .values([
          { threadId: older.thread.id, role: 'assistant', content: 'First reply' },
          { threadId: older.thread.id, role: 'assistant', content: '  \nLast reply\nsecond line' },
        ]);
      // The reply moved the older thread to the top.
      const bumped = await api('list@example.com')[':id'].messages.$post({
        ...idOf(older),
        json: { text: 'thanks' },
      });
      expect(bumped.status).toBe(201);

      const response = await api('list@example.com').$get();

      expect(response.status).toBe(200);
      expectOk(response);
      const listed = (await response.json()).threads;
      expect(listed.map((t) => [t.id, t.title, t.preview])).toEqual([
        [older.thread.id, 'older', 'Last reply'],
        [newer.thread.id, 'newer', null],
      ]);
    });
  });

  describe('GET /:id', () => {
    it("reads the thread with its messages oldest first, and knows nothing of another person's", async () => {
      const mine = await start('read@example.com', 'mine');
      const message = await api('read@example.com')[':id'].messages.$post({
        ...idOf(mine),
        json: { text: 'and more' },
      });
      expect(message.status).toBe(201);

      const own = await api('read@example.com')[':id'].$get(idOf(mine));
      const theirs = await api('other-read@example.com')[':id'].$get(idOf(mine));
      const nonsense = await api('read@example.com')[':id'].$get({ param: { id: 'abc' } });

      expect(own.status).toBe(200);
      expectOk(own);
      expect((await own.json()).messages.map((m) => m.content)).toEqual(['mine', 'and more']);
      expect(theirs.status).toBe(404);
      expect(theirs.headers.get('content-type')).toBe('application/problem+json');
      expect(nonsense.status).toBe(404);
    });
  });

  describe('POST /:id/messages', () => {
    it('refuses a message past the ceiling', async () => {
      const started = await start('long@example.com', 'Hi');

      const long = await api('long@example.com')[':id'].messages.$post({
        ...idOf(started),
        json: { text: 'a'.repeat(4001) },
      });

      expect(long.status).toBe(400);
      expect((await storedMessages(started.thread.id)).map((m) => m.content)).toEqual(['Hi']);
    });
  });

  describe('POST /:id/answer', () => {
    it("streams the coach's reading and words, then stores the reply and ends with it", async () => {
      const started = await start('answer@example.com', 'How was my week?');

      const response = await api('answer@example.com', twoWords)[':id'].answer.$post(idOf(started));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^text\/event-stream/);
      const got = frames(await response.text());
      expect(got.slice(0, 3)).toEqual([
        { event: 'reading', data: {} },
        { event: 'text', data: { text: 'Nice' } },
        { event: 'text', data: { text: ' start.' } },
      ]);
      expect(got[3]).toMatchObject({
        event: 'done',
        data: { message: { role: 'assistant', content: 'Nice start.' } },
      });
      const stored = await storedMessages(started.thread.id);
      expect(stored.map((m) => [m.role, m.content])).toEqual([
        ['user', 'How was my week?'],
        ['assistant', 'Nice start.'],
      ]);
      // The coach saw the whole thread, as the caller.
      expect(consulted.at(-1)).toMatchObject({
        userId: await userIdOf(proxy.env, 'answer@example.com'),
        history: started.messages,
      });
    });

    it("answers 409 when the coach already has the last word, and 404 for another person's thread", async () => {
      const started = await start('answered@example.com', 'Hi');
      await database(proxy.env.DB)
        .insert(messages)
        .values({ threadId: started.thread.id, role: 'assistant', content: 'Hello' });

      const again = await api('answered@example.com', twoWords)[':id'].answer.$post(idOf(started));
      const theirs = await api('other-answered@example.com', twoWords)[':id'].answer.$post(
        idOf(started),
      );

      expect(again.status).toBe(409);
      expect(theirs.status).toBe(404);
    });

    it('ends with an error event and stores nothing when the coach fails, even after some words', async () => {
      const started = await start('failing@example.com', 'Hi');

      const response = await api('failing@example.com', failing)[':id'].answer.$post(idOf(started));

      expect(response.status).toBe(200);
      expect(frames(await response.text()).at(-1)).toEqual({
        event: 'error',
        data: { reason: 'unavailable' },
      });
      expect((await storedMessages(started.thread.id)).map((m) => m.role)).toEqual(['user']);
    });
  });
});
