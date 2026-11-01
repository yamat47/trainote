// tokens.css in its two shapes, both from design/system/tokens.json. The app's (design/
// src/tokens.css) follows the OS through prefers-color-scheme when no theme is set; the
// artifact's (design/project/tokens.css) is the shape the design-system page compiles,
// which the page does not write for a system kept in code, with the icon font declared
// since the page serves the font file beside it.
export type Theme = 'light' | 'dark';
type Value = string | Record<Theme, string>;
type Token = { name: string; value: Value };
type Style = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
};
type Font = { family: string; file: string; weight: string; style: string };
export type Tokens = {
  name: string;
  color: { tokens: Token[] };
  type: {
    fonts: Font[];
    families: Record<string, string>;
    groups: { family: string; styles: Style[] }[];
  };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  stroke: { tokens: Token[] };
  shadow: { tokens: Token[] };
};

// The font file's format, named by its extension.
const format = (file: string) => file.slice(file.lastIndexOf('.') + 1);

const themed = (value: Value, theme: Theme) => (typeof value === 'string' ? value : value[theme]);

const declare = (tokens: Token[], theme: Theme, indent = '  ') =>
  tokens.map((token) => `${indent}--${token.name}: ${themed(token.value, theme)};`).join('\n');

const families = (tokens: Tokens) =>
  Object.entries(tokens.type.families)
    .map(([name, stack]) => `  --font-${name}: ${stack};`)
    .join('\n');

const styles = (tokens: Tokens) =>
  tokens.type.groups
    .flatMap((group) =>
      group.styles.map((style) => {
        const spacing =
          style.letterSpacing === undefined ? '' : ` letter-spacing: ${style.letterSpacing};`;
        return `.${style.name} { font-family: var(--font-${group.family}); font-size: ${style.fontSize}; line-height: ${style.lineHeight}; font-weight: ${style.fontWeight};${spacing} }`;
      }),
    )
    .join('\n');

export function appTokensCss(tokens: Tokens): string {
  const all = [
    ...tokens.color.tokens,
    ...tokens.spacing.tokens,
    ...tokens.radius.tokens,
    ...tokens.stroke.tokens,
    ...tokens.shadow.tokens,
  ];
  // Only the themed tokens need a dark declaration.
  const dark = all.filter((token) => typeof token.value !== 'string');
  return [
    '/* Generated from design/system/tokens.json by scripts/tokens.ts. Edit the design, then run `pnpm tokens`. */',
    ':root,',
    '[data-theme="light"] {',
    declare(all, 'light'),
    families(tokens),
    '}',
    '[data-theme="dark"] {',
    declare(dark, 'dark'),
    '}',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    declare(dark, 'dark', '    '),
    '  }',
    '}',
    styles(tokens),
    '',
  ].join('\n');
}

export function artifactTokensCss(tokens: Tokens): string {
  const perTheme = [...tokens.color.tokens, ...tokens.shadow.tokens];
  const fixed = [...tokens.spacing.tokens, ...tokens.radius.tokens, ...tokens.stroke.tokens];
  return [
    `/* ${tokens.name} — generated from tokens.json */`,
    ':root, [data-theme="light"] {',
    declare(perTheme, 'light'),
    '}',
    '[data-theme="dark"] {',
    declare(perTheme, 'dark'),
    '}',
    ':root {',
    declare(fixed, 'light'),
    families(tokens),
    '}',
    styles(tokens),
    ...tokens.type.fonts.map(
      (font) =>
        `@font-face { font-family: "${font.family}"; src: url("${font.file}") format("${format(font.file)}"); font-weight: ${font.weight}; font-style: ${font.style}; font-display: block; }`,
    ),
    '',
  ].join('\n');
}
