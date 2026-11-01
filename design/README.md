# Design

The visual source of trainote, in two parts.

- `system/` is the design system: `tokens.json` (Apple's system colors in both themes, the system font at iOS text-style sizes, spacing, radii), `tokens.css` compiled from it, `README.md` with the usage rules, and `components/` with the React components (`bundle.js`, `bundle.css`, `index.d.ts`) plus a guideline and a live preview per component. `fonts/` carries Framework7 Icons 5.0.5, the MIT icon font the tab bar uses, for the canvas and the previews; the app ships the same file from the npm package.
- `screens/` is the eight iPhone screens as Design Component pages (`*.dc.html`). Each one mounts the real components from `system/` and takes a light or dark theme as a tweak. `screens/renders/` is a render of each screen in both themes, made with a local harness around the same files, not with the canvas.

- `src/` is the design system's source from 2026-11-01 on: the components as TSX with their CSS, `tokens.css` generated from `system/tokens.json`, and a story per component for Storybook (`make storybook`). The app imports from here and writes no CSS of its own.

`system/` and `screens/` were copied by hand from the artifacts on claude.ai (design system version 1793103317-d855, canvas version 1793103344-137b). The direction has since turned around: this repository is the source and the design-system artifact is published from it; `docs/design.md` has the flow. Until the publish pipeline lands, `system/tokens.json` is the tokens' source and the rest of `system/` is the last copy taken.

The screens are not standalone HTML. They expect the Design runtime (`support.js`) and `ds/trainote/` relative to each file, which on the canvas is a copy of `system/`.
