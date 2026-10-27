# Design

The visual source of trainote, in two parts.

- `system/` is the design system: `tokens.json` (Apple's system colors in both themes, the system font at iOS text-style sizes, spacing, radii), `tokens.css` compiled from it, `README.md` with the usage rules, and `components/` with the React components (`bundle.js`, `bundle.css`, `index.d.ts`) plus a guideline and a live preview per component. `fonts/` carries Framework7 Icons, the MIT icon font the tab bar uses.
- `screens/` is the eight iPhone screens as Design Component pages (`*.dc.html`). Each one mounts the real components from `system/` and takes a light or dark theme as a tweak.

Both are edited visually on claude.ai and copied here by hand when they change; the links are in `docs/requirements.md`. This folder is what the implementation reads: build the app's CSS variables from `system/tokens.json`, keep the component names and props, and treat `system/README.md` as the brand book.

The screens are not standalone HTML. They expect the Design runtime (`support.js`) and `ds/trainote/` relative to each file, which on the canvas is a copy of `system/`.
