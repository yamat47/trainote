import type { Answer, Conversation, Message, ThreadSummary } from '../worker/threads.ts';
import { client, expectOk } from './api.ts';
import { frames, type Frame } from './sse.ts';

export type { Conversation, Message, ThreadSummary };

// The screens pushed over the Coach tab: a thread by id, and today's weekly review, the
// address the Sunday notification opens, which becomes a thread's once it is opened.
export type CoachScreen = { kind: 'thread'; id: number } | { kind: 'weekly-review' };

const WEEKLY_REVIEW = '/coach/weekly-review';
const THREAD = /^\/coach\/(\d+)$/;

export function coachScreen(path: string): CoachScreen | undefined {
  if (path === WEEKLY_REVIEW) return { kind: 'weekly-review' };
  const id = THREAD.exec(path)?.[1];
  return id === undefined ? undefined : { kind: 'thread', id: Number(id) };
}

export const threadPath = (id: number) => `/coach/${String(id)}`;

// The threads, the last written first, each with the coach's last line as its preview.
export async function loadThreads(): Promise<{ threads: ThreadSummary[] }> {
  const response = await client.api.threads.$get();
  expectOk(response, 'GET /api/threads');
  return response.json();
}

// A chat opened with the person's first message; nothing is answered yet.
export async function startThread(text: string): Promise<Conversation> {
  const response = await client.api.threads.$post({ json: { text } });
  expectOk(response, 'POST /api/threads');
  return response.json();
}

// Today's weekly review, opened with its fixed first message when there is none yet.
export async function openWeeklyReview(): Promise<Conversation> {
  const response = await client.api.threads.$post({ json: { kind: 'weekly-review' } });
  expectOk(response, 'POST /api/threads');
  return response.json();
}

const param = (id: number) => ({ param: { id: String(id) } });

export async function loadThread(id: number): Promise<Conversation> {
  const response = await client.api.threads[':id'].$get(param(id));
  expectOk(response, 'GET /api/threads/:id');
  return response.json();
}

// The person's message, stored; the answer is asked for separately.
export async function sendMessage(id: number, text: string): Promise<Message> {
  const response = await client.api.threads[':id'].messages.$post({ ...param(id), json: { text } });
  expectOk(response, 'POST /api/threads/:id/messages');
  return (await response.json()).message;
}

// The Worker writes each frame from an Answer (worker/threads.ts); reading one back is
// the trust a typed response.json() is.
function answerOf(frame: Frame): Answer {
  const data: unknown = JSON.parse(frame.data);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { event: frame.event, data } as Answer;
}

// The coach's answer to the thread as it is written: reading notices, pieces of text,
// then the stored reply or the failure. Throws when the stream cannot be opened or breaks.
// The route is called with fetch at the client's URL, since the answer is a stream the
// client's response type does not know.
export async function* answers(id: number): AsyncGenerator<Answer> {
  const response = await fetch(client.api.threads[':id'].answer.$url(param(id)), {
    method: 'POST',
  });
  expectOk(response, 'POST /api/threads/:id/answer');
  if (response.body === null) throw new Error('POST /api/threads/:id/answer answered no body');
  for await (const frame of frames(response.body)) yield answerOf(frame);
}

// The last message is the person's: a thread just started, or one whose reply failed.
export const unanswered = ({ messages }: Conversation) => messages.at(-1)?.role === 'user';
