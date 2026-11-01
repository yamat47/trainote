trainote is a one-person body-make note that lives on an iPhone home screen. The person writes what they did, in Japanese, in one rough line; the app files each act as a Win or a Slip, keeps their weight beside it, and a coach reads the page back to them once a week. It looks like an iPhone app: it follows Apple's Human Interface Guidelines with the system font, the system colors and the standard controls, flat, without Liquid Glass. Numbers and their trends are the subject; everything else keeps quiet.

## Content

- Labels, buttons, tabs, empty states and notifications are English. What the person writes, and what Claude answers, is Japanese. Never translate the person's words, never paraphrase them in a list.
- Sentence case everywhere: "Weekly review", "Add weight", "Reading your notes". Never all caps, not even group headers (the one place this departs from iOS), never title case.
- Short and factual. No exclamation marks, no emoji, no praise in the chrome. Encouragement is Claude's job, in Japanese, one sentence at a time.
- The two kinds of entry are **Win** and **Slip**, always in that order, and the words appear only in filters and the weekly sentence: "9 wins and 2 slips this week, 6 days in a row." In a list an entry shows its `Mark` and the person's own words, nothing more.
- The categories are Exercise, Food, Sleep and Life. The tabs are Notes, Weight, Coach and Profile.
- A number carries its unit, separated by a space: "64.2 kg", "5.0 km", "40 min", "60 kg × 10 × 3". Weight keeps one decimal. Day headers read "Today", "Yesterday", then "Friday, Oct 23"; a change reads "−0.6 kg this week". Write sentences, not meta strings: never join facts with middle dots or dashes.

## Color

Apple's system colors, in Apple's values, with a light and a dark theme. Dark follows the OS setting; there is no toggle. Where an Apple pair falls short of 4.5:1 its token note says so; the values stay as Apple ships them.

- `system-background` is the page behind plain lists, the navigation bar and the tab bar. `grouped-background` with `grouped-cell` is the page behind the inset grouped list of Profile. `secondary-background` is the one raised block on a plain page: the structured preview under the Notes entry. Nothing else is a surface: no cards, no gradients, no custom tints.
- Set text and numerals in `label`. Set dates, units, a row's detail, inactive tab items, and every Slip (its text and its − mark) in `secondary-label`. Placeholders are `tertiary-label`.
- `separator` draws the hairline between rows at `stroke-separator`, inset from the left to where the row's text starts.
- `tint` is the one accent: text buttons, the prominent button's fill with `on-tint` text, the selected tab, links, the weight line and my chat bubble. `tint-soft` is the tinted button's fill.
- `red` is systemRed and means exactly two things: the dashed goal line on the weight graph, and a destructive action such as Delete. Never for Edit, never for a Slip, never for emphasis.
- Win and Slip differ by `label` against `secondary-label`, never by hue, so they read the same to every eye and in both themes.
- `fill` is a pressed row; `tertiary-fill` and `segment-selected` with `shadow-segment` are the segmented control; `bubble` is the coach's chat bubble.

## Type

- The system font, loaded by nothing: `-apple-system` resolves to SF Pro for Latin and digits and to Hiragino Sans for Japanese on iOS, exactly as Apple's own apps set them. The stack ends in Helvetica Neue and Arial for other platforms.
- Sizes are iOS text styles at the default size: `large-title` for the screen title and the big number, `title-2` for a section heading, `headline` for emphasis and the bold navigation action, `body` for everything the person reads or types, `subheadline` for a row's second line, `footnote` for day and group headers and units, `caption-1` for status lines, `caption-2` for timestamps in a thread and axis labels on the graph, `tab-label` under a tab icon.
- Every numeral is tabular: `font-variant-numeric: tabular-nums`, which SF Pro honours, so columns of weights and reps line up.
- No downloaded text font (the icon font is the one `@font-face`), no second family, no monospace for data.

## Layout

- One phone column at a 390px design width; content, separators and inset groups keep the `margin` from the screen edge. Nothing scrolls sideways.
- Every tab starts with a `NavBar` large title that collapses as the list scrolls, and ends with the `TabBar` above the home indicator. The first thing under the title is the thing the tab is for: on Notes the `Week` strip and the entry field, on Weight the entry field and the graph.
- Notes, Weight and Coach are plain lists on `system-background`: full-width `Row`s with separators, newest first, grouped by day under a `ListHeader` (Today, Yesterday, Friday, Oct 23). Profile is an inset grouped list: `Group`s of `Row`s on `grouped-background`.
- Each collection begins with its inline entry as the first row: a multiline `Field` on Notes, a numeric `Field` with its unit on Weight. No modals, no wizards, no floating button, no underlined or boxed inputs. The one boxed input is the composer at the bottom of a Coach thread, a Messages-style capsule, because the thread is modelled on Messages.
- Weight shows one period at a time, chosen with `Segmented` (W, M, 6M, Y) as in Health; every entry is behind a `tint` row, Show all entries. Filters are pills with `radius-capsule` or a menu, never chips in a row of colours.
- Coach is a Messages-style thread of `Bubble`s: mine in `tint`, the coach's in `bubble`.

## Marks and icons

- Icons are Framework7 Icons 5.0.5, the MIT icon font drawn to match SF Symbols, carried as `fonts/Framework7Icons-Regular.woff2` (its license beside it) for the canvas and the previews and declared in `tokens.json`; the app ships the same file from the npm package `framework7-icons@5.0.5`; an icon is `<i class="f7-icons">name</i>`, the name a ligature. SF Symbols themselves are licensed for Apple platforms only and are not used. Icons appear in the tab bar (25px) and as the disclosure chevron; actions are words.
- The tab icons are `doc_text`, `chart_bar`, `bubble_left_bubble_right` and `person_crop_circle`, each switching to its `_fill` variant when selected.
- `+` (U+002B) and `−` (U+2212, the minus sign, not a hyphen) are the Win and Slip marks, set in semibold `body` through `Mark`. The Win mark is `label`, the Slip mark `secondary-label`.
- The home-screen app icon does not exist yet. Until it does, set the name in plain `large-title` type on `system-background`; do not draw a mark.

## Charts

- The weight graph is a `stroke-plot` line in `tint` over hairline gridlines in `separator`, with the goal as a dashed `red` line and axis labels in `footnote` on `secondary-label`. Exercise trends are drawn the same way.
- Nothing is filled, nothing is animated, and the latest value is written beside its point in `headline`.

## States and motion

- Press: a row fills with `fill`; a button dims to 60% opacity, as iOS does. Keyboard focus: a 2px `tint` outline. Disabled: 35% opacity.
- Loading: a `caption-1` line in `secondary-label` such as "Reading your notes", no spinner.
- An error: a `caption-1` line in `red` directly under the row it concerns.
- Motion: none of our own. iOS supplies the navigation.

## Components

`window.Trainote`, React 18. Screens are composed from these; what is not here yet (the weight graph, the period control, the chat bubble, filter pills) is drawn per screen until it settles, then added. The structured preview is settled: an `Inset` headed "Read as 3 entries", the rows on a `secondary-background` block with `radius-group`, Claude's one sentence as `Text` in `subheadline` on `secondary-label`, then `Actions` with Edit text and Save 3 entries.

- `Screen`: the shell of a tab: the safe area, the content and the `TabBar` held at the bottom. `tone` is `plain` or `grouped`.
- `NavBar`: the large title and an optional trailing action; with `back`, the compact bar of a pushed screen such as All entries.
- `TabBar`: the four icon tabs. Pass `items` with `icon` and `iconActive`, `active` and `onChange`.
- `ListHeader`: the `footnote` line above a run of rows: Today, Yesterday, Friday, Oct 23, October, Read as 3 entries.
- `List`: a run of plain rows under a `ListHeader`: a day's entries on Notes.
- `Inset`: the one raised block on a plain page: rows on `secondary-background` under an optional header. The structured preview.
- `Group`: an inset grouped section of rows with an optional `header` and `footer`, for Profile.
- `Row`: one row of a list. Pass `kind` for an entry, the words as children, the numbers as `sub`, a number or date as `detail`; `accessory: "disclosure"` adds the chevron; `tone: "tint"` makes the row an action in `tint`, like Add Account in Settings; `error` puts the red `caption-1` line directly under it.
- `Mark`: the + or − of an entry. Pass `kind`.
- `Text`: one line at the margin in an iOS text style (`footnote`, `subheadline`, `caption-1`), `secondary` or, as an `<output>`, `error`.
- `Field`: the multiline entry row of Notes, and the labelled value row with a unit on Weight (Today, Body fat).
- `Stat`: the big number of a screen with its unit and label, and the week's change beside it: today's weight.
- `Button`: `prominent` for Save, `plain` for Edit and Cancel. `tinted` and `destructive` arrive with the screens that need them.
- `Actions`: the row of buttons under a field or a preview, `fill` or `end`, with the place for its error line.
- `Week`: the seven days of this week, Monday first, each with its count of wins above its count of slips; today's label is `tint`. The memorable thing on Notes: a week of effort at a glance, in numbers.
- `Icon`: a Framework7 Icons glyph by name, for the tab bar and the chevron.

Segmented (the period control) and Bubble (a chat message) were drawn with the first screens and arrive with the Weight graph and the Coach tab.
