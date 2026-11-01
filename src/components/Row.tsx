import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { EntryKind } from '../../worker/db/schema.ts';
import { Mark } from './Mark.tsx';

type RowProps = {
  kind?: EntryKind;
  tone?: 'tint';
  sub?: ReactNode;
  detail?: ReactNode;
  accessory?: 'disclosure';
  muted?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

const classes = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export function Row({ kind, tone, sub, detail, accessory, muted, onClick, children }: RowProps) {
  const className = classes(
    'tn-row',
    kind !== undefined && 'tn-row-with-mark',
    (muted ?? kind === 'slip') && 'tn-row-muted',
    tone === 'tint' && 'tn-row-tint',
    onClick !== undefined && 'tn-row-press',
  );
  const content = (
    <>
      {kind === undefined ? null : (
        <span className="tn-row-mark">
          <Mark kind={kind} />
        </span>
      )}
      <span className="tn-row-text">
        {children}
        {sub === undefined ? null : <span className="tn-row-sub">{sub}</span>}
      </span>
      {detail === undefined ? null : <span className="tn-row-detail">{detail}</span>}
      {accessory === 'disclosure' ? (
        <span className="tn-row-chevron">
          <Icon name="chevron_right" />
        </span>
      ) : null}
    </>
  );
  return onClick === undefined ? (
    <div className={className}>{content}</div>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
