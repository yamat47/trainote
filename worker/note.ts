// A note is a few lines; the ceiling keeps one request from carrying a pasted document.
// The page enforces it on the textarea and the preview route on the body. The model's
// max_tokens in structure.ts and the entries ceiling in entries.ts are sized from it.
export const MAX_NOTE_LENGTH = 2000;
