import type { ReactNode } from 'react';

type GroupProps = { header?: string; footer?: ReactNode; children?: ReactNode };

export function Group({ header, footer, children }: GroupProps) {
  return (
    <section className="tn-group">
      {header === undefined ? null : <h2 className="tn-group-header">{header}</h2>}
      <div className="tn-group-body">{children}</div>
      {footer === undefined ? null : <p className="tn-group-footer">{footer}</p>}
    </section>
  );
}
