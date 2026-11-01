import { describe, expect, it } from 'vitest';
import { frames, takeFrames, type Frame } from './sse.ts';

describe('takeFrames', () => {
  it('cuts the whole frames off the text and keeps the frame still arriving', () => {
    const taken = takeFrames(
      'event: reading\ndata: {}\n\nevent: text\ndata: {"text":"Nice"}\n\nevent: te',
    );
    expect(taken.frames).toEqual([
      { event: 'reading', data: '{}' },
      { event: 'text', data: '{"text":"Nice"}' },
    ]);
    expect(taken.rest).toBe('event: te');
  });

  it('keeps nothing when the text ends on a frame boundary', () => {
    expect(takeFrames('event: done\ndata: {"message":1}\n\n')).toEqual({
      frames: [{ event: 'done', data: '{"message":1}' }],
      rest: '',
    });
  });

  it('joins the data lines of one frame and names an unnamed one message', () => {
    expect(takeFrames('data: one\ndata: two\n\n').frames).toEqual([
      { event: 'message', data: 'one\ntwo' },
    ]);
  });

  it('ignores comments, ids and a block without data', () => {
    expect(takeFrames(': keep-alive\n\n\n\nid: 3\nevent: text\ndata: x\n\n').frames).toEqual([
      { event: 'text', data: 'x' },
    ]);
  });
});

// The body in chunks, as a connection delivers it.
const body = (chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const collect = async (stream: ReadableStream<Uint8Array>) => {
  const seen: Frame[] = [];
  for await (const frame of frames(stream)) seen.push(frame);
  return seen;
};

describe('frames', () => {
  it('reassembles a frame cut between chunks, even inside a character', async () => {
    const bytes = new TextEncoder().encode('event: text\ndata: {"text":"体重"}\n\n');
    // The cut lands in the three bytes of 体.
    const at = bytes.indexOf(0xe4) + 1;
    expect(await collect(body([bytes.slice(0, at), bytes.slice(at)]))).toEqual([
      { event: 'text', data: '{"text":"体重"}' },
    ]);
  });

  it('yields the last frame when the body ends without a blank line', async () => {
    const bytes = new TextEncoder().encode('event: done\ndata: {}');
    expect(await collect(body([bytes]))).toEqual([{ event: 'done', data: '{}' }]);
  });
});
