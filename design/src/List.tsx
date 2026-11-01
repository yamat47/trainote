import type { ReactNode } from 'react';
import { ListHeader } from './ListHeader.tsx';

type ListProps = { header?: string; children: ReactNode };

// A run of plain rows under a list header: a day's entries on Notes.
export function List({ header, children }: ListProps) {
  return (
    <section className="tn-list">
      {header === undefined ? null : <ListHeader>{header}</ListHeader>}
      {children}
    </section>
  );
}
