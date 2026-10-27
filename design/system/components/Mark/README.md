The + or − that tells a Win from a Slip.

Pass `kind`: `win` renders a plus sign in `label`, `slip` a minus sign (U+2212) in `secondary-label`, each in a 22px box set in semibold `body`. It carries an `aria-label` of "Win" or "Slip". The two differ by weight of colour, never by hue.

- Do: use it as the `mark` of a `Row`, aligned on the row's left edge.
- Don't: colour a Slip with `red`, replace the marks with icons or emoji, or show a mark without the entry's words.
