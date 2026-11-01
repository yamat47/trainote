import type { ReactNode } from 'react';
import { ListHeader } from './ListHeader.tsx';

type InsetProps = { header?: string; children: ReactNode };

// The one raised block on a plain page: rows on secondary-background with the group
// radius, under an optional list header. Notes shows the structured preview in it.
export function Inset({ header, children }: InsetProps) {
  return (
    <section className="tn-inset">
      {header === undefined ? null : <ListHeader>{header}</ListHeader>}
      <div className="tn-inset-body">{children}</div>
    </section>
  );
}
