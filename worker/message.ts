// A message is a few paragraphs at most; the ceiling keeps one request from carrying a
// pasted document, as MAX_NOTE_LENGTH does for a note. The page enforces it on the
// composer and the thread routes on the body.
export const MAX_MESSAGE_LENGTH = 4000;
