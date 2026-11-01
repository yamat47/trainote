The shell of every tab: the status bar's safe area above, the content, and the tab bar held at the bottom.

Pass `tabBar` (the `TabBar`) and the tab's content as children, starting with its `NavBar`. `tone` is `plain` for a full-width list (Notes, Weight, Coach) and `grouped` for an inset grouped list (Profile): the page and its navigation bar take `system-background` or `grouped-background`. The stylesheet's base rules reset the body, so an app on this system writes no CSS of its own.

- Do: put exactly one `Screen` on the page, with the `NavBar` as its first child.
- Don't: scroll the content in an inner box; the page scrolls and the tab bar sticks.
