A line of text at the page's margin: the sentence under the week strip, Claude's one sentence under a preview, the error line under a field or a row of buttons.

Pass `variant`, an iOS text style (`footnote`, `subheadline`, `caption-1`); the font comes from tokens.css and the spacing from the style. `tone` is `secondary` (the default) for a sentence that explains, or `error` for the one red line under the thing it concerns, which renders as an `<output>` so a screen reader announces it when it appears.

- Do: write a sentence, with a full stop; say what happened and what to do ("Could not save. Try again.").
- Don't: use it for a heading (that is `ListHeader`) or for the text inside a row (that is `Row`'s `sub`).
