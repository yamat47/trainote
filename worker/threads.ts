import { and, desc, eq, gte, max, not, sql, type SQL } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { validator } from 'hono/validator';
import { z } from 'zod';
import type { AppEnv } from './app.ts';
import { jsonBody } from './body.ts';
import { CoachError, type Coach, type Emit, type Reason } from './coach.ts';
import { database, type Database } from './db/index.ts';
import {
  messages,
  NOW,
  secondsFromNow,
  threads,
  type MessageRole,
  type ThreadKind,
} from './db/schema.ts';
import { MAX_MESSAGE_LENGTH, unanswered } from './message.ts';
import { problem } from './problem.ts';
import { tokyoDate, tokyoDayStart } from './week.ts';
import { firstLine } from './words.ts';

// How a weekly review opens, in the owner's language, by decision (docs/requirements.md).
export const WEEKLY_REVIEW_OPENING =
  '今週の行動と体重を読んで、できたこと、つまずき、来週の方針を 1 つにまとめて';
const WEEKLY_REVIEW_TITLE = 'Weekly review';

// A row of the list: the title fits one line, the preview under it two.
const TITLE_LENGTH = 40;
const PREVIEW_LENGTH = 120;

// A reply is written under a claim on its thread, so a second answer asked for meanwhile
// (the thread left and opened again, the reminder tapped twice) is refused instead of
// written beside the first. The Worker renews the claim while it works; a Worker stopped
// without letting go, as happens 30 seconds after the phone goes away (the most
// waitUntil allows), leaves a claim that lapses on its own.
const CLAIM_SECONDS = 30;
const RENEW_MS = 10_000;
const BEING_ANSWERED = 'The thread is being answered';

const Text = z.object({ text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) });
const NewThread = z.union([Text, z.object({ kind: z.literal('weekly-review') })]);

const textBody = jsonBody(Text, 'Body must carry a non-empty text');
const newThreadBody = jsonBody(NewThread, 'Body must carry a text, or the kind weekly-review');

// An id that is not a positive integer names no thread, the same as one that is not
// the caller's.
const idParam = validator('param', (value, c) => {
  const id = Number(value['id']);
  return Number.isSafeInteger(id) && id > 0 ? { id } : problem(c, 404, 'Thread not found');
});

// A reply is being written: the thread is claimed, and the claim has not lapsed.
const claimLive = sql`(${threads.answerClaim} is not null and ${threads.answerExpiresAt} > ${NOW})`;
const released = { answerClaim: null, answerExpiresAt: null };

// What the page reads of a thread and a message; the owner, the claim and the thread's id
// stay in the database.
const threadColumns = {
  id: threads.id,
  kind: threads.kind,
  title: threads.title,
  createdAt: threads.createdAt,
  updatedAt: threads.updatedAt,
};
const shownThread = {
  ...threadColumns,
  answering: sql<boolean>`${claimLive}`.mapWith(Boolean),
};
const shownMessage = {
  id: messages.id,
  role: messages.role,
  content: messages.content,
  createdAt: messages.createdAt,
};

export type Thread = Pick<typeof threads.$inferSelect, keyof typeof threadColumns> & {
  answering: boolean;
};
export type Message = Pick<typeof messages.$inferSelect, keyof typeof shownMessage>;
// A thread in the list, with the first line of the coach's last reply under its title.
export type ThreadSummary = Thread & { preview: string | null };
export type Conversation = { thread: Thread; messages: Message[] };

// An answer as the page reads it off the stream: the SSE event name and its JSON data.
// `done` carries the stored reply, `error` the reason for the log; the page says the same
// thing for every reason.
export type Answer =
  | { event: 'text'; data: { text: string } }
  | { event: 'reading'; data: Record<string, never> }
  | { event: 'done'; data: { message: Message } }
  | { event: 'error'; data: { reason: Reason } };

// Starting a thread and sending a message only store; the answer is asked for
// separately, so a retry after a failed one and the first reply of a weekly review go
// the same way.
export function threadRoutes(coach: Coach) {
  return new Hono<AppEnv>()
    .get('/', async (c) =>
      c.json({ threads: await listThreads(database(c.env.DB), c.get('user').id) }),
    )
    .post('/', newThreadBody, async (c) => {
      const body = c.req.valid('json');
      const db = database(c.env.DB);
      const userId = c.get('user').id;
      if ('kind' in body) {
        const { conversation, created } = await openWeeklyReview(db, userId, new Date());
        if (!created) return c.json(conversation, 200);
        c.header('location', `/api/threads/${String(conversation.thread.id)}`);
        return c.json(conversation, 201);
      }
      const started = await startThread(db, userId, 'chat', titleOf(body.text), body.text);
      c.header('location', `/api/threads/${String(started.thread.id)}`);
      return c.json(started, 201);
    })
    .get('/:id', idParam, async (c) => {
      const found = await readThread(database(c.env.DB), c.get('user').id, c.req.valid('param').id);
      return found === undefined ? problem(c, 404, 'Thread not found') : c.json(found);
    })
    .post('/:id/messages', idParam, textBody, async (c) => {
      const db = database(c.env.DB);
      const { id } = c.req.valid('param');
      if ((await findThread(db, c.get('user').id, id)) === undefined) {
        return problem(c, 404, 'Thread not found');
      }
      const message = await storeMessage(db, id, c.req.valid('json').text);
      if (message === undefined) return problem(c, 409, BEING_ANSWERED);
      return c.json({ message }, 201);
    })
    .post('/:id/answer', idParam, async (c) => {
      const db = database(c.env.DB);
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const claim = crypto.randomUUID();
      // The claim goes first, so the thread read after it in the same batch is the one
      // this request answers.
      const [claimed, [thread], history] = await db.batch([
        claimAnswer(db, userId, id, claim),
        ...conversationQueries(db, userId, id),
      ]);
      if (thread === undefined) return problem(c, 404, 'Thread not found');
      if (claimed.length === 0) {
        return problem(
          c,
          409,
          unanswered({ messages: history }) ? BEING_ANSWERED : 'Nothing to answer',
        );
      }
      return streamSSE(c, (stream) => {
        const write = (answer: Answer) =>
          stream.writeSSE({ event: answer.event, data: JSON.stringify(answer.data) });
        // A write after the phone went away is dropped by the stream; the reply is
        // finished and stored all the same when it is done within the 30 seconds the
        // Worker is given after that, and the thread shows it when opened next. A longer
        // one is stopped with the Worker, and its claim lapses.
        const emit: Emit = (event) =>
          write(
            event.type === 'reading'
              ? { event: 'reading', data: {} }
              : { event: 'text', data: { text: event.text } },
          );
        const consultation = { db, userId, history, now: new Date() };
        const answered = (async () => {
          const renewal = setInterval(() => {
            renewClaim(db, id, claim).catch((error: unknown) => {
              console.error('the claim on the thread could not be renewed', error);
            });
          }, RENEW_MS);
          try {
            const reply = await coach(c.env, consultation, emit).finally(() => {
              clearInterval(renewal);
            });
            const message = await storeReply(db, id, claim, reply);
            if (message === undefined) throw new Error('the claim lapsed before the reply');
            await write({ event: 'done', data: { message } });
          } catch (error) {
            const reason = error instanceof CoachError ? error.reason : 'failed';
            console.error(
              'the coach could not answer',
              reason,
              error instanceof CoachError ? error.cause : error,
            );
            // Let go before saying so, so the page's Try again finds the thread free.
            await releaseClaim(db, id, claim).catch((dropError: unknown) => {
              console.error('the claim on the thread could not be dropped', dropError);
            });
            await write({ event: 'error', data: { reason } });
          }
        })();
        // Without this the Worker stops with the response once the reader is gone, and
        // the person's message stays unanswered (seen in wrangler dev, 2026-11-01).
        keepRunning(c, answered);
        return answered;
      });
    });
}

// Hono throws when there is no execution context, which is how the tests call the app;
// there the work runs to its end anyway.
function keepRunning(c: Context<AppEnv>, work: Promise<void>) {
  try {
    c.executionCtx.waitUntil(work);
  } catch {
    // See above.
  }
}

export const titleOf = (text: string) => firstLine(text, TITLE_LENGTH);
const previewOf = (text: string) => firstLine(text, PREVIEW_LENGTH);

const mine = (userId: number, id: number) => and(eq(threads.userId, userId), eq(threads.id, id));

export async function listThreads(db: Database, userId: number): Promise<ThreadSummary[]> {
  const lastReply = db
    .select({ threadId: messages.threadId, lastId: max(messages.id).as('last_id') })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(and(eq(threads.userId, userId), eq(messages.role, 'assistant')))
    .groupBy(messages.threadId)
    .as('last_reply');
  const [rows, replies] = await db.batch([
    db
      .select(shownThread)
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(desc(threads.updatedAt), desc(threads.id)),
    db
      .select({ threadId: messages.threadId, content: messages.content })
      .from(messages)
      .innerJoin(lastReply, eq(messages.id, lastReply.lastId)),
  ]);
  const previews = new Map(replies.map((reply) => [reply.threadId, previewOf(reply.content)]));
  return rows.map((thread) => Object.assign(thread, { preview: previews.get(thread.id) ?? null }));
}

// The thread alone, or nothing when it is not the caller's.
async function findThread(db: Database, userId: number, id: number): Promise<Thread | undefined> {
  const [thread] = await db.select(shownThread).from(threads).where(mine(userId, id));
  return thread;
}

// The thread and its messages oldest first, as two queries for one batch; neither finds
// anything when the thread is not the caller's.
const conversationQueries = (db: Database, userId: number, id: number) =>
  [
    db.select(shownThread).from(threads).where(mine(userId, id)),
    db
      .select(shownMessage)
      .from(messages)
      .innerJoin(threads, eq(messages.threadId, threads.id))
      .where(mine(userId, id))
      .orderBy(messages.id),
  ] as const;

export async function readThread(
  db: Database,
  userId: number,
  id: number,
): Promise<Conversation | undefined> {
  const [[thread], list] = await db.batch(conversationQueries(db, userId, id));
  return thread === undefined ? undefined : { thread, messages: list };
}

type Opened = { conversation: Conversation; created: boolean };

// The review opened today in Tokyo, or a new one with its fixed opening: the reminder
// tapped twice, or the entry row pressed again, lands in the same thread.
async function openWeeklyReview(db: Database, userId: number, now: Date): Promise<Opened> {
  const since = tokyoDayStart(tokyoDate(now)).toISOString();
  const [today] = await db
    .select({ id: threads.id })
    .from(threads)
    .where(
      and(
        eq(threads.userId, userId),
        eq(threads.kind, 'weekly-review'),
        gte(threads.createdAt, since),
      ),
    )
    .orderBy(desc(threads.id))
    .limit(1);
  const open = today === undefined ? undefined : await readThread(db, userId, today.id);
  if (open !== undefined) return { conversation: open, created: false };
  const started = await startThread(
    db,
    userId,
    'weekly-review',
    WEEKLY_REVIEW_TITLE,
    WEEKLY_REVIEW_OPENING,
  );
  return { conversation: started, created: true };
}

// One batch, so no thread is ever left without its first message: the message takes the
// thread's id from SQLite, since the batch runs before any row comes back.
async function startThread(
  db: Database,
  userId: number,
  kind: ThreadKind,
  title: string,
  text: string,
): Promise<Conversation> {
  const [[thread], [message]] = await db.batch([
    db.insert(threads).values({ userId, kind, title }).returning(shownThread),
    db
      .insert(messages)
      .values({ threadId: sql`last_insert_rowid()`, role: 'user', content: text })
      .returning(shownMessage),
  ]);
  if (thread === undefined || message === undefined) throw new Error('the thread was not stored');
  return { thread, messages: [message] };
}

// A message stored on its thread where the condition holds. An insert from a select names
// every column of the table in order; the id and the time are left to SQLite as they are
// on a plain insert.
const messageWhere = (
  db: Database,
  threadId: number,
  role: MessageRole,
  content: string,
  condition: SQL,
) =>
  db
    .insert(messages)
    .select(
      db
        .select({
          id: sql<number>`null`.as('id'),
          threadId: threads.id,
          role: sql<MessageRole>`${role}`.as('role'),
          content: sql<string>`${content}`.as('content'),
          createdAt: sql<string>`${NOW}`.as('created_at'),
        })
        .from(threads)
        .where(and(eq(threads.id, threadId), condition)),
    )
    .returning(shownMessage);

// A message moves its thread to the top of the list: the thread's updatedAt is set by
// hand, since no column of the thread itself changes. Nothing is stored while a reply is
// being written, which would answer the thread without this message and leave it
// unanswered behind.
async function storeMessage(
  db: Database,
  threadId: number,
  content: string,
): Promise<Message | undefined> {
  const [[message]] = await db.batch([
    messageWhere(db, threadId, 'user', content, not(claimLive)),
    db
      .update(threads)
      .set({ updatedAt: NOW })
      .where(and(eq(threads.id, threadId), not(claimLive))),
  ]);
  return message;
}

const held = (threadId: number, claim: string) =>
  and(eq(threads.id, threadId), eq(threads.answerClaim, claim));

// The thread taken for one reply: the caller's, ending with their message, and with no
// claim alive on it. One statement, so of two answers asked for at once only one gets it.
function claimAnswer(db: Database, userId: number, threadId: number, claim: string) {
  const lastRole = db
    .select({ role: messages.role })
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(desc(messages.id))
    .limit(1);
  return db
    .update(threads)
    .set({ answerClaim: claim, answerExpiresAt: secondsFromNow(CLAIM_SECONDS) })
    .where(and(mine(userId, threadId), not(claimLive), eq(sql`(${lastRole})`, 'user')))
    .returning({ id: threads.id });
}

async function renewClaim(db: Database, threadId: number, claim: string) {
  await db
    .update(threads)
    .set({ answerExpiresAt: secondsFromNow(CLAIM_SECONDS) })
    .where(held(threadId, claim));
}

async function releaseClaim(db: Database, threadId: number, claim: string) {
  await db.update(threads).set(released).where(held(threadId, claim));
}

// The reply is stored while its claim holds, and the claim is let go in the same batch.
// A claim taken over means another answer is writing the reply, and a lapsed one could be
// taken at any moment and a message stored meanwhile, so either way this reply is dropped
// rather than stored beside or after what it did not read.
async function storeReply(
  db: Database,
  threadId: number,
  claim: string,
  content: string,
): Promise<Message | undefined> {
  const [[message]] = await db.batch([
    messageWhere(
      db,
      threadId,
      'assistant',
      content,
      sql`${eq(threads.answerClaim, claim)} and ${claimLive}`,
    ),
    db
      .update(threads)
      .set({ ...released, updatedAt: NOW })
      .where(held(threadId, claim)),
  ]);
  return message;
}
