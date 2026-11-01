import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { MAX_MESSAGE_LENGTH } from '../../worker/message.ts';
import { tokyoDate } from '../../worker/week.ts';
import { Actions } from '../../design/src/Actions.tsx';
import { Bubble } from '../../design/src/Bubble.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Composer } from '../../design/src/Composer.tsx';
import { Field } from '../../design/src/Field.tsx';
import { List } from '../../design/src/List.tsx';
import { NavBar } from '../../design/src/NavBar.tsx';
import { Row } from '../../design/src/Row.tsx';
import { Text } from '../../design/src/Text.tsx';
import {
  answers,
  loadThread,
  loadThreads,
  openWeeklyReview,
  sendMessage,
  startThread,
  threadPath,
  unanswered,
  type CoachScreen,
  type Conversation,
  type Message,
} from '../coach.ts';
import { shortDate } from '../dates.ts';
import { Failed } from '../Failed.tsx';
import { useLoaded } from '../loaded.ts';

const SEND_FAILED = 'Could not send. Try again.';

type CoachProps = {
  screen: CoachScreen | undefined;
  onPush: (path: string) => void;
  onReplace: (path: string) => void;
  onBack: () => void;
};

export function Coach({ screen, onPush, onReplace, onBack }: CoachProps) {
  const back = { label: 'Coach', onClick: onBack };
  if (screen === undefined) return <ThreadList onOpen={(id) => onPush(threadPath(id))} />;
  if (screen.kind === 'weekly-review') return <WeeklyReview back={back} onReplace={onReplace} />;
  return <Thread key={screen.id} id={screen.id} back={back} />;
}

// What the person is writing, in the Field of the list or the Composer of a thread.
type Draft = { text: string; sending: boolean; failed: boolean };

const EMPTY: Draft = { text: '', sending: false, failed: false };
const typed = (text: string) => (prev: Draft) => ({ ...prev, text, failed: false });
const sending = (prev: Draft) => ({ ...prev, sending: true, failed: false });
const notSent = (prev: Draft) => ({ ...prev, sending: false, failed: true });

const threadDate = (updatedAt: string) => shortDate(tokyoDate(new Date(updatedAt)));

function ThreadList({ onOpen }: { onOpen: (id: number) => void }) {
  const { shown, reload } = useLoaded(loadThreads);
  const [draft, setDraft] = useState(EMPTY);
  const [review, setReview] = useState({ opening: false, failed: false });

  // A new thread is stored with its first message, then opened; the coach answers there.
  const send = async () => {
    const text = draft.text.trim();
    if (text === '' || draft.sending) return;
    setDraft(sending);
    try {
      onOpen((await startThread(text)).thread.id);
    } catch {
      setDraft(notSent);
    }
  };

  const startReview = async () => {
    if (review.opening) return;
    setReview({ opening: true, failed: false });
    try {
      onOpen((await openWeeklyReview()).thread.id);
    } catch {
      setReview({ opening: false, failed: true });
    }
  };

  return (
    <>
      <NavBar title="Coach" />
      <Field
        kind="multiline"
        value={draft.text}
        onChange={(text) => setDraft(typed(text))}
        placeholder="Ask your coach"
        ariaLabel="New thread"
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={draft.sending}
      />
      <Actions align="end" error={draft.failed ? SEND_FAILED : undefined}>
        {draft.text.trim() === '' ? null : (
          <Button disabled={draft.sending} onClick={() => void send()}>
            Send
          </Button>
        )}
      </Actions>
      <Row
        tone="tint"
        accessory="disclosure"
        detail="Sundays, 20:00"
        error={review.failed ? 'Could not start the weekly review. Try again.' : undefined}
        onClick={() => void startReview()}
      >
        Start weekly review
      </Row>
      {shown.status === 'failed' ? (
        <Failed message="Could not load your threads." onRetry={reload} />
      ) : null}
      {shown.status === 'ready' && shown.threads.length === 0 ? (
        <Text variant="footnote">Your threads will show here.</Text>
      ) : null}
      {shown.status === 'ready' && shown.threads.length > 0 ? (
        <List>
          {shown.threads.map((thread) => (
            <Row
              key={thread.id}
              accessory="disclosure"
              detail={threadDate(thread.updatedAt)}
              preview={thread.preview}
              onClick={() => onOpen(thread.id)}
            >
              {thread.title}
            </Row>
          ))}
        </List>
      ) : null}
    </>
  );
}

type Back = { label: string; onClick: () => void };

// Which attempt at opening a screen is current, counted up by each attempt and by the
// effect's cleanup: an attempt that is no longer current, whether it was cleaned up or
// tried again, must not act on what it gets.
type Run = RefObject<number>;

const next = (run: Run) => {
  run.current += 1;
  return run.current;
};

// The notification's address: today's weekly review is opened, or started with its fixed
// first message, and the address becomes the thread's, which answers it.
function WeeklyReview({ back, onReplace }: { back: Back; onReplace: (path: string) => void }) {
  const [failed, setFailed] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    void openReview(run, next(run), onReplace, setFailed);
    return () => {
      next(run);
    };
  }, [onReplace]);

  return (
    <>
      <NavBar title="Weekly review" back={back} />
      {failed ? (
        <Failed
          message="Could not start the weekly review."
          onRetry={() => {
            setFailed(false);
            void openReview(run, next(run), onReplace, setFailed);
          }}
        />
      ) : null}
    </>
  );
}

async function openReview(
  run: Run,
  mine: number,
  onReplace: (path: string) => void,
  setFailed: Dispatch<SetStateAction<boolean>>,
) {
  try {
    const conversation = await openWeeklyReview();
    if (run.current === mine) onReplace(threadPath(conversation.thread.id));
  } catch {
    if (run.current === mine) setFailed(true);
  }
}

// The coach's reply as the thread shows it: none wanted, one being written (the text so
// far, and whether the coach is reading the records right now), or one that did not come.
type Reply =
  | { status: 'idle' }
  | { status: 'answering'; text: string; reading: boolean }
  | { status: 'failed' };
type Answering = Extract<Reply, { status: 'answering' }>;

type Opened =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; conversation: Conversation; reply: Reply };

const FAILED: Reply = { status: 'failed' };

// The reply starts being written, whatever came of the one before.
const answering = (prev: Opened): Opened =>
  prev.status === 'ready'
    ? { ...prev, reply: { status: 'answering', text: '', reading: false } }
    : prev;

// A change to the reply while it is being written; one that arrives after it was given up
// on changes nothing.
const whileAnswering =
  (update: (reply: Answering) => Reply) =>
  (prev: Opened): Opened =>
    prev.status === 'ready' && prev.reply.status === 'answering'
      ? { ...prev, reply: update(prev.reply) }
      : prev;

// A message stored at the thread's end, and no reply wanted until the next one is asked.
const withMessage =
  (message: Message) =>
  (prev: Opened): Opened =>
    prev.status === 'ready'
      ? {
          status: 'ready',
          conversation: {
            ...prev.conversation,
            messages: [...prev.conversation.messages, message],
          },
          reply: { status: 'idle' },
        }
      : prev;

// The thread on the screen: which one, the attempt that is current, and where it is shown.
type Shown = { id: number; run: Run; setOpened: Dispatch<SetStateAction<Opened>> };

// A reply that did not arrive whole is shown no further: the Worker stores nothing of
// it either, so the thread reads the same after a reload.
async function answer({ id, run, setOpened }: Shown, mine: number) {
  const live = () => run.current === mine;
  setOpened(answering);
  try {
    for await (const event of answers(id)) {
      if (!live()) return;
      switch (event.event) {
        case 'reading':
          setOpened(whileAnswering((reply) => ({ ...reply, reading: true })));
          break;
        case 'text':
          setOpened(
            whileAnswering((reply) => ({
              status: 'answering',
              text: reply.text + event.data.text,
              reading: false,
            })),
          );
          break;
        case 'done':
          setOpened(withMessage(event.data.message));
          return;
        case 'error':
          setOpened(whileAnswering(() => FAILED));
          return;
      }
    }
    // The stream ended without the reply: the connection was lost on the way.
    if (live()) setOpened(whileAnswering(() => FAILED));
  } catch {
    if (live()) setOpened(whileAnswering(() => FAILED));
  }
}

// The thread is loaded, and answered when its last message is the person's: just
// started, opened from the notification, or left after a reply that did not come.
async function open(shown: Shown, mine: number) {
  const { id, run, setOpened } = shown;
  let conversation: Conversation;
  try {
    conversation = await loadThread(id);
  } catch {
    if (run.current === mine) setOpened({ status: 'failed' });
    return;
  }
  if (run.current !== mine) return;
  setOpened({ status: 'ready', conversation, reply: { status: 'idle' } });
  if (unanswered(conversation)) await answer(shown, mine);
}

function Thread({ id, back }: { id: number; back: Back }) {
  const [opened, setOpened] = useState<Opened>({ status: 'loading' });
  const [draft, setDraft] = useState(EMPTY);
  const run = useRef(0);
  const shown: Shown = { id, run, setOpened };

  useEffect(() => {
    void open({ id, run, setOpened }, next(run));
    return () => {
      next(run);
    };
  }, [id]);

  // The newest message stays in view as the thread opens and as the reply is written;
  // before paint, so a long thread does not show its top first.
  const messageCount = opened.status === 'ready' ? opened.conversation.messages.length : 0;
  const written =
    opened.status === 'ready' && opened.reply.status === 'answering' ? opened.reply.text.length : 0;
  useLayoutEffect(() => {
    if (messageCount === 0 && written === 0) return;
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messageCount, written]);

  const send = async () => {
    const text = draft.text.trim();
    if (text === '' || draft.sending) return;
    setDraft(sending);
    try {
      setOpened(withMessage(await sendMessage(id, text)));
      setDraft(EMPTY);
      await answer(shown, run.current);
    } catch {
      setDraft(notSent);
    }
  };

  if (opened.status !== 'ready') {
    return (
      <>
        <NavBar title="" back={back} />
        {opened.status === 'failed' ? (
          <Failed
            message="Could not load this thread."
            onRetry={() => {
              setOpened({ status: 'loading' });
              void open(shown, next(run));
            }}
          />
        ) : null}
      </>
    );
  }
  const { conversation, reply } = opened;
  return (
    <>
      <NavBar title={conversation.thread.title} back={back} />
      {conversation.messages.map((message) => (
        <Bubble key={message.id} from={message.role === 'user' ? 'me' : 'coach'}>
          {message.content}
        </Bubble>
      ))}
      {reply.status === 'answering' && reply.text !== '' ? (
        <Bubble from="coach">{reply.text}</Bubble>
      ) : null}
      {reply.status === 'answering' && reply.reading ? (
        <Text variant="caption-1">Reading your notes</Text>
      ) : null}
      {reply.status === 'failed' ? (
        <Failed
          message="Could not reach your coach."
          onRetry={() => void answer(shown, run.current)}
        />
      ) : null}
      <Composer
        value={draft.text}
        onChange={(text) => setDraft(typed(text))}
        onSend={() => void send()}
        disabled={reply.status === 'answering' || draft.sending}
        error={draft.failed ? SEND_FAILED : undefined}
        maxLength={MAX_MESSAGE_LENGTH}
      />
    </>
  );
}
