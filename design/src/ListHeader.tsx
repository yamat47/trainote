import type { ReactNode } from 'react';

type ListHeaderProps = { children: ReactNode };

// The footnote line above a run of rows: Today, Yesterday, Read as 3 entries.
export function ListHeader({ children }: ListHeaderProps) {
  return <h2 className="tn-list-header">{children}</h2>;
}
