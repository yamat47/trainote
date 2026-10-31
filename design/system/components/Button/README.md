An iOS button in four styles.

Pass `variant`: `prominent` is a 50px `tint` fill with `on-tint` text and `radius-button`, for Save on a structured preview and for "Start weekly review"; `tinted` is the same shape on `tint-soft`, for a secondary call to action; `plain` is `tint` text one `row` tall, for Edit, Cancel, Filter and navigation-bar actions, with `bold` on the one that commits; `destructive` is `red` text, for Delete only. `block` stretches a button to the width of its container. Any button attribute passes through. Pressing dims the button to 60%, as iOS does.

- Do: label with a verb in sentence case: "Save", "Edit", "Cancel", "Delete thread".
- Don't: use `red` for anything but a destructive action, put two `prominent` buttons on a screen, or add an icon to a button.
