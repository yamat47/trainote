A glyph from Framework7 Icons, the MIT icon font drawn to match SF Symbols.

Pass `name`, the glyph's ligature (`doc_text`, `chevron_right`): the font renders the name itself as the icon, at the size and colour of the surrounding text, hidden from screen readers. The tab bar sets its four icons at 25px and switches each to its `_fill` variant when selected; the disclosure chevron of a `Row` is the other place an icon appears.

- Do: keep icons to the tab bar and the chevron; an action is a word.
- Don't: use an SF Symbol (licensed for Apple platforms only), colour an icon apart from its text, or put an icon in a button.
