An entry row: the inline creation at the top of Notes and Weight, and a value row in Profile.

Pass `multiline` for the Notes entry, a full-width textarea row where the person writes everything they did in one go; it grows by whole lines. Pass `label` for a labelled value row, which right-aligns the input, and `numeric` with `unit` for weight and body fat, which sets tabular figures and a decimal keyboard. Text is `body` in `label`; placeholders are `tertiary-label`. Controlled with `value` and `onChange`, or uncontrolled with `defaultValue`.

- Do: write every `placeholder` in English, sentence case, and give an unlabelled field an `ariaLabel`.
- Don't: draw a border or an underline, float the label, or put a field inside a modal.
