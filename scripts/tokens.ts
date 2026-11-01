// Writes src/tokens.css from design/system/tokens.json, the copy of the design system
// that the implementation reads. Dark values follow the OS through prefers-color-scheme,
// since the app has no theme toggle. The icon font is not declared here: it comes from
// the framework7-icons package.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import source from '../design/system/tokens.json' with { type: 'json' };

type Theme = 'light' | 'dark';
type Value = string | Record<Theme, string>;
type Token = { name: string; value: Value };
type Style = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
};
type Tokens = {
  color: { tokens: Token[] };
  type: { families: Record<string, string>; groups: { family: string; styles: Style[] }[] };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  stroke: { tokens: Token[] };
  shadow: { tokens: Token[] };
};

const target = path.resolve(import.meta.dirname, '..', 'src', 'tokens.css');

const themed = (value: Value, theme: Theme) => (typeof value === 'string' ? value : value[theme]);

// Only the themed tokens need a dark declaration.
const dark = (token: Token) => typeof token.value !== 'string';

function render(tokens: Tokens): string {
  const all = [
    ...tokens.color.tokens,
    ...tokens.spacing.tokens,
    ...tokens.radius.tokens,
    ...tokens.stroke.tokens,
    ...tokens.shadow.tokens,
  ];
  const declare = (theme: Theme, only: (token: Token) => boolean) =>
    all
      .filter(only)
      .map((token) => `  --${token.name}: ${themed(token.value, theme)};`)
      .join('\n');
  const families = Object.entries(tokens.type.families)
    .map(([name, stack]) => `  --font-${name}: ${stack};`)
    .join('\n');
  const styles = tokens.type.groups
    .flatMap((group) =>
      group.styles.map((style) => {
        const spacing =
          style.letterSpacing === undefined ? '' : ` letter-spacing: ${style.letterSpacing};`;
        return `.${style.name} { font-family: var(--font-${group.family}); font-size: ${style.fontSize}; line-height: ${style.lineHeight}; font-weight: ${style.fontWeight};${spacing} }`;
      }),
    )
    .join('\n');
  return [
    '/* Generated from design/system/tokens.json by scripts/tokens.ts. Edit the design, then run `pnpm tokens`. */',
    ':root {',
    declare('light', () => true),
    families,
    '}',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    declare('dark', dark).replace(/^/gm, '  '),
    '  }',
    '}',
    styles,
    '',
  ].join('\n');
}

await writeFile(target, render(source));
