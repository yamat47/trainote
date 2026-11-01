import type { ChangeEvent } from 'react';
import { classes } from './classes.ts';

// A field is named one way or the other: a labelled value row (Today, Body fat) with
// the label at the left and the value at the right, or an unlabelled field that says
// what it is to a screen reader.
type Named = { label: string; ariaLabel?: undefined } | { label?: undefined; ariaLabel: string };

// What the field takes: a line of text; the Notes entry, a textarea that grows with the
// text; a number with its unit, with tabular figures and the decimal keyboard; a whole
// number (a year, days a week), the same with the number pad; a calendar day as
// YYYY-MM-DD, picked with the platform's date control.
export type FieldKind = 'text' | 'multiline' | 'numeric' | 'whole' | 'date';

const INPUT_MODE: Partial<Record<FieldKind, 'decimal' | 'numeric'>> = {
  numeric: 'decimal',
  whole: 'numeric',
};

type FieldProps = Named & {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  kind?: FieldKind;
  unit?: string;
  maxLength?: number;
  disabled?: boolean;
};

// An entry row with no border and no underline; the row's separator is the only line.
// The multiline form grows with the text, wrapped lines included, so the note is never
// scrolled inside its own row: the wrapper's ::after mirrors the text and sizes the
// grid cell the textarea fills. Rows alone would count only the line breaks, and
// measuring would need an effect.
export function Field({
  value,
  onChange,
  placeholder,
  label,
  ariaLabel,
  kind = 'text',
  unit,
  maxLength,
  disabled,
}: FieldProps) {
  const shared = {
    className: 'tn-field-input',
    value,
    placeholder,
    'aria-label': label === undefined ? ariaLabel : undefined,
    maxLength,
    disabled,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
  };
  return (
    <label
      className={classes(
        'tn-field',
        (kind === 'numeric' || kind === 'whole') && 'tn-field-numeric',
      )}
    >
      {label === undefined ? null : <span className="tn-field-label">{label}</span>}
      {kind === 'multiline' ? (
        <span className="tn-field-grow" data-value={value}>
          <textarea {...shared} rows={1} />
        </span>
      ) : (
        <input {...shared} type={kind === 'date' ? 'date' : 'text'} inputMode={INPUT_MODE[kind]} />
      )}
      {unit === undefined ? null : <span className="tn-field-unit">{unit}</span>}
    </label>
  );
}
