import type { ReactNode } from 'react';
import { classes } from './classes.ts';

type BubbleProps = {
  // Mine sits at the right in tint, the coach's at the left in the bubble grey.
  from: 'me' | 'coach';
  children: ReactNode;
};

// One message of a Coach thread, Messages style. The text keeps the line breaks the
// coach writes, so a reply of a few paragraphs reads as paragraphs.
export function Bubble({ from, children }: BubbleProps) {
  return (
    <div className={classes('tn-bubble', from === 'me' && 'tn-bubble-me')}>
      <p className="tn-bubble-body">{children}</p>
    </div>
  );
}
