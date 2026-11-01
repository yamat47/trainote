export type EntryKind = 'win' | 'slip';

type MarkProps = { kind: EntryKind };

// U+002B and U+2212: the plus sign and the minus sign, not a hyphen. The glyph is
// decoration to a screen reader, which gets the word instead.
export function Mark({ kind }: MarkProps) {
  const slip = kind === 'slip';
  return (
    <>
      <span className={slip ? 'tn-mark tn-mark-slip' : 'tn-mark'} aria-hidden="true">
        {slip ? '\u2212' : '+'}
      </span>
      <span className="sr-only">{slip ? 'Slip' : 'Win'}</span>
    </>
  );
}
