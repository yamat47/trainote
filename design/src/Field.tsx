type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  maxLength?: number;
  disabled?: boolean;
};

// The entry row at the top of Notes: a multiline field with no border and no underline;
// the row's separator is the only line. It grows with the text, wrapped lines included,
// so the note is never scrolled inside its own row: the wrapper's ::after mirrors the
// text and sizes the grid cell the textarea fills. Rows alone would count only the line
// breaks, and measuring would need an effect. The labelled single-line form (a weight
// with its unit) arrives with the Weight tab.
export function Field({
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxLength,
  disabled,
}: FieldProps) {
  return (
    <label className="tn-field">
      <span className="tn-field-grow" data-value={value}>
        <textarea
          className="tn-field-input"
          rows={1}
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          maxLength={maxLength}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}
