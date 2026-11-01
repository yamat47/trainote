// "1 win", "2 wins": the one plural rule the wording needs, shared by the Worker's
// notification and the page's sentences.
export const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

// "9 wins and 2 slips this week", the phrase the notification and the Notes strip share
// by decision. A week without a note has no phrase; each caller says its own thing then.
export const weekPhrase = (wins: number, slips: number): string | undefined =>
  wins === 0 && slips === 0
    ? undefined
    : `${plural(wins, 'win')} and ${plural(slips, 'slip')} this week`;
