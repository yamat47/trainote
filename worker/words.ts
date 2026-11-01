// "1 win", "2 wins": the one plural rule the wording needs, shared by the Worker's
// notification and the page's sentences.
export const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

// "9 wins and 2 slips this week", the phrase the notification and the Notes strip share
// by decision. A week without a note has no phrase; each caller says its own thing then.
export const weekPhrase = (wins: number, slips: number): string | undefined =>
  wins === 0 && slips === 0
    ? undefined
    : `${plural(wins, 'win')} and ${plural(slips, 'slip')} this week`;

const graphemes = new Intl.Segmenter();

// The first non-empty line of a text, cut to `length` characters with an ellipsis: a
// thread's title and the preview under it. The characters are graphemes, so a cut never
// splits an emoji or a combining mark.
export function firstLine(text: string, length: number): string {
  const line =
    text
      .split('\n')
      .map((part) => part.trim())
      .find((part) => part !== '') ?? '';
  const characters = Array.from(graphemes.segment(line), (part) => part.segment);
  return characters.length > length ? `${characters.slice(0, length - 1).join('')}…` : line;
}
