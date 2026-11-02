import type { ReactNode } from 'react';
import { Text } from './Text.tsx';

type ActionsProps = {
  // Fill lays the buttons across the width with a prominent one taking the room; end
  // keeps a single plain button at the right, like a navigation bar action; split puts the
  // first button at the left and the rest at the right.
  align?: 'fill' | 'end' | 'split';
  // The red line under the buttons when what they did failed.
  error?: string | undefined;
  children: ReactNode;
};

// A row of buttons under a field or a preview, with the place for its error line.
export function Actions({ align = 'fill', error, children }: ActionsProps) {
  return (
    <div className={align === 'fill' ? 'tn-actions' : `tn-actions tn-actions-${align}`}>
      <div className="tn-actions-row">{children}</div>
      {error === undefined ? null : (
        <Text variant="caption-1" tone="error">
          {error}
        </Text>
      )}
    </div>
  );
}
