One message in a Coach thread, Messages style.

Pass `from`: `me` renders a `tint` bubble with `on-tint` text at the right, `coach` a `bubble` grey one with `label` text at the left. Text is `body`, wraps inside 78% of the width with `radius-bubble` corners, and keeps the line breaks Claude sends. A tool-running notice ("Reading your notes") is not a bubble: it is a `Text` in `caption-1` under the last bubble.

- Do: stream the coach's reply into one bubble as it arrives.
- Don't: add avatars, names or timestamps to every bubble; one `footnote` time line per day is enough.
