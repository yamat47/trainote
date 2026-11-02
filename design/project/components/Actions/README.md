A row of buttons under a field or a preview, with the place for its error line.

Pass `Button`s as children. `align` is `fill` (the default): the buttons sit at the left margin and a prominent one takes the remaining width, as in "Edit text" beside "Save 3 entries"; `end`: a single plain button at the right, like a navigation bar action ("Read as entries", "Try again"); or `split`: the first button at the left and the rest at the right, as in "Delete" apart from "Cancel" and "Read as entry" under an entry being edited, which then become "Cancel" apart from "Delete entry", so a second tap where Delete was lands on Cancel. `error` is the red caption under the row when what the buttons did failed.

- Do: name in each button what will happen ("Save 3 entries"), and put at most one prominent button in a row.
- Don't: stack buttons vertically or center them.
