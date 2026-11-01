The navigation bar at the top of every screen: a large title on a tab, a compact one on a pushed screen.

Pass `title` and, optionally, a trailing action as `trailing` (a `Button` with `variant="plain"`, bold for the one that commits). The title is `large-title` in `label` on `system-background`; it collapses to a centred compact title as the list scrolls, which the screen implements. On a pushed screen such as All entries, pass `back` with the `label` of the screen it returns to and its `onClick`: the bar takes its 44px inline form with the title centred in `headline` and the way back at the left in `tint`, a chevron before the label.

- Do: keep the title to the tab's name: Notes, Weight, Coach, Profile. Inside a thread, the thread's title.
- Don't: put a search field, a segmented control or a stat inside the bar; those are the first rows of the list.
