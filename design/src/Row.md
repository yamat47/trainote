One row of a list: an optional mark, the text, an optional detail on the right, an optional disclosure chevron.

Children are the text in `body`. Pass `kind` (`win` or `slip`) for an entry: the row renders its `Mark`, insets the separator to the text, and a Slip is muted. (`mark` and `muted` override that.) Pass the extracted exercise numbers as `sub`, a `subheadline` second line with tabular figures, or the first line of what the row opens as `preview`, the same second line cut after two lines (the coach's last reply under a thread's title). Pass a date or a value such as "64.2 kg" as `detail`, set in `secondary-label`. `accessory="disclosure"` adds the chevron for a row that opens something. Set `muted` on a Slip. Give `onClick` to make the row a button with the pressed and focus states.

- Do: let long entries wrap; the row grows by whole lines. Inside a `Group`, the last row has no separator.
- Don't: put two details in one row, colour the text, or add icons to the left of a row.

Pass `error` for the red `caption-1` line directly under the text when what the row did failed ("Could not change the reminder. Try again."); it is an `<output>`, announced when it appears. `sub` stays for a second line of content.
