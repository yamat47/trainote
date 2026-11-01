An entry row: the inline creation at the top of Notes and Weight, and a value row in Profile.

Pass `kind`: `multiline` for the Notes entry, a full-width textarea row where the person writes everything they did in one go, which grows with the text; `numeric` with `unit` for weight and body fat, which sets tabular figures and a decimal keyboard; `date` for a calendar day, which the platform's date control picks; or nothing for a line of text. Pass `label` for a labelled value row, which puts the label at the left and the value at the right. Text is `body` in `label`; placeholders are `tertiary-label`. Controlled with `value` and `onChange`.

- Do: write every `placeholder` in English, sentence case, and give an unlabelled field an `ariaLabel`.
- Don't: draw a border or an underline, float the label, or put a field inside a modal.
