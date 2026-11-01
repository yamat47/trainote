import type { ChangeEvent } from 'react';
import { classes } from './classes.ts';

// A field is named one way or the other: a labelled value row (Today, Body fat) with
// the label at the left and the value at the right, or an unlabelled field that says
// what it is to a screen reader.
type Named = { label: string; ariaLabel?: undefined } | { label?: undefined; ariaLabel: string };

type FieldProps = Named & {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  // The Notes entry: a textarea that grows with the text.
  multiline?: boolean;
  // A number with its unit: tabular figures and the decimal keyboard.
  numeric?: boolean;
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
  multiline = false,
  numeric = false,
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
    <label className={classes('tn-field', numeric && 'tn-field-numeric')}>
      {label === undefined ? null : <span className="tn-field-label">{label}</span>}
      {multiline ? (
        <span className="tn-field-grow" data-value={value}>
          <textarea {...shared} rows={1} />
        </span>
      ) : (
        <input {...shared} type="text" inputMode={numeric ? 'decimal' : undefined} />
      )}
      {unit === undefined ? null : <span className="tn-field-unit">{unit}</span>}
    </label>
  );
}
