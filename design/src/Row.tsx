import type { ReactNode } from 'react';
import { classes } from './classes.ts';
import { Icon } from './Icon.tsx';
import type { EntryKind } from './types.ts';
import { Mark } from './Mark.tsx';

type RowProps = {
  kind?: EntryKind;
  tone?: 'tint';
  sub?: ReactNode;
  // What the row opens, in its own words, cut to two lines: the coach's last line under a
  // thread's title.
  preview?: string | null | undefined;
  // The red caption directly under the row's text when what the row did failed.
  error?: string | undefined;
  detail?: ReactNode;
  accessory?: 'disclosure';
  muted?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

export function Row({
  kind,
  tone,
  sub,
  preview,
  error,
  detail,
  accessory,
  muted,
  onClick,
  children,
}: RowProps) {
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
        {preview === undefined || preview === null ? null : (
          <span className="tn-row-sub tn-row-preview">{preview}</span>
        )}
        {error === undefined ? null : <output className="tn-row-error">{error}</output>}
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
