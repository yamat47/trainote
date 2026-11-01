The reply field at the bottom of a Coach thread, the one boxed input in the system: a Messages-style capsule with the send button beside it.

Controlled with `value` and `onChange`; `onSend` is the arrow button, which is enabled once the text is not blank. The capsule is a `separator` hairline with `radius-capsule` on `system-background`, text in `body`, and it grows with the text. The button is `arrow_up_circle_fill` in `tint`, 32px. It holds the bottom of the screen in place of the tab bar, above the home indicator. Pass `disabled` while the coach is answering, and `error` for the red `caption-1` line above the capsule when the message could not be sent.

- Do: keep the placeholder to "Message", and leave the text in place when sending fails.
- Don't: use it anywhere but a thread; a new thread starts from the `Field` at the top of the Coach list.
