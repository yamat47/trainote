A row of buttons under a field or a preview, with the place for its error line.

Pass `Button`s as children. `align` is `fill` (the default): the buttons sit at the left margin and a prominent one takes the remaining width, as in "Edit text" beside "Save 3 entries"; or `end`: a single plain button at the right, like a navigation bar action ("Read as entries", "Try again"). `error` is the red caption under the row when what the buttons did failed.

- Do: name in each button what will happen ("Save 3 entries"), and put at most one prominent button in a row.
- Don't: stack buttons vertically or center them.
