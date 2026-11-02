import type { MessageRole } from './db/schema.ts';

// A message is a few paragraphs at most; the ceiling keeps one request from carrying a
// pasted document, as MAX_NOTE_LENGTH does for a note. The page enforces it on the
// composer and the thread routes on the body.
export const MAX_MESSAGE_LENGTH = 4000;

// The thread waits for a reply: its last message is the person's, as in a thread just
// started or one whose reply did not come. The Worker and the page decide it the same way.
export const unanswered = ({ messages }: { messages: readonly { role: MessageRole }[] }) =>
  messages.at(-1)?.role === 'user';
