// A frame of a server-sent events body: its event name and its data lines joined.
export type Frame = { event: string; data: string };

// `event:` names it, `data:` lines are its body; an id, a retry or a comment is passed
// over, and a block with no data at all (a keep-alive comment) is no frame, as the
// event-stream rules have it.
function parseFrame(block: string): Frame | undefined {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice('event:'.length).trimStart();
    else if (line.startsWith('data:')) data.push(line.slice('data:'.length).trimStart());
  }
  return data.length === 0 ? undefined : { event, data: data.join('\n') };
}

// The whole frames in the text so far, and the text after the last blank line, which
// is a frame still arriving: a chunk of the body can end anywhere, even inside a line.
export function takeFrames(text: string): { frames: Frame[]; rest: string } {
  const blocks = text.split('\n\n');
  const rest = blocks.pop() ?? '';
  return { frames: blocks.map(parseFrame).filter((frame) => frame !== undefined), rest };
}

// The frames of a response body as they arrive. The body is read with a reader rather
// than iterated, which Safari does not do; the decoder's stream mode holds back a
// character split across two chunks.
export async function* frames(body: ReadableStream<Uint8Array>): AsyncGenerator<Frame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let rest = '';
  try {
    /* eslint-disable no-await-in-loop -- the chunks arrive one after another */
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const taken = takeFrames(rest + decoder.decode(value, { stream: true }));
      rest = taken.rest;
      yield* taken.frames;
    }
    /* eslint-enable no-await-in-loop */
  } finally {
    // Left early (the thread was closed), the rest of the body is not downloaded; a body
    // read to its end has nothing left to cancel.
    void reader.cancel();
  }
  const last = parseFrame(rest);
  if (last !== undefined) yield last;
}
