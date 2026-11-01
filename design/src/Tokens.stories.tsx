import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import tokens from '../system/tokens.json' with { type: 'json' };

type Theme = 'light' | 'dark';
type Token = { name: string; value: unknown; usage?: string };
type Style = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
  usage?: string;
};

// A token's value is a string, or one string per theme.
function valueOf(value: unknown, theme: Theme): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && theme in value) {
    const themed: unknown = Reflect.get(value, theme);
    return typeof themed === 'string' ? themed : '';
  }
  return '';
}

const cell = { padding: '6px 12px 6px 0', verticalAlign: 'top' as const };
const mono = { fontVariantNumeric: 'tabular-nums' as const };

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 28,
        height: 28,
        borderRadius: 6,
        background: color,
        boxShadow: 'inset 0 0 0 1px rgba(127,127,127,0.35)',
        verticalAlign: 'middle',
      }}
    />
  );
}

function Colors({ list }: { list: Token[] }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {list.map((token) => (
          <tr key={token.name}>
            <td style={cell}>
              <Swatch color={valueOf(token.value, 'light')} />
              <span className="tn-sr-only">light</span>
            </td>
            <td style={cell}>
              <Swatch color={valueOf(token.value, 'dark')} />
              <span className="tn-sr-only">dark</span>
            </td>
            <td style={{ ...cell, ...mono }}>
              <code>--{token.name}</code>
            </td>
            <td style={{ ...cell, ...mono, color: 'var(--secondary-label)' }}>
              {valueOf(token.value, 'light')} / {valueOf(token.value, 'dark')}
            </td>
            <td style={{ ...cell, color: 'var(--secondary-label)' }}>{token.usage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Lengths({ list, draw }: { list: Token[]; draw: (value: string) => CSSProperties }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {list.map((token) => (
          <tr key={token.name}>
            <td style={cell}>
              <span
                aria-hidden="true"
                style={{ display: 'inline-block', ...draw(valueOf(token.value, 'light')) }}
              />
              <span className="tn-sr-only">sample</span>
            </td>
            <td style={{ ...cell, ...mono }}>
              <code>--{token.name}</code>
            </td>
            <td style={{ ...cell, ...mono, color: 'var(--secondary-label)' }}>
              {valueOf(token.value, 'light')}
            </td>
            <td style={{ ...cell, color: 'var(--secondary-label)' }}>{token.usage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TypeStyles({ styles }: { styles: Style[] }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {styles.map((style) => (
          <tr key={style.name}>
            <td style={cell}>
              <span className={style.name}>The quick brown fox 64.2 kg</span>
            </td>
            <td style={{ ...cell, ...mono }}>
              <code>.{style.name}</code>
            </td>
            <td style={{ ...cell, ...mono, color: 'var(--secondary-label)' }}>
              {style.fontSize} / {style.lineHeight} / {style.fontWeight}
            </td>
            <td style={{ ...cell, color: 'var(--secondary-label)' }}>{style.usage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const section = { margin: '0 0 8px', fontSize: 22, lineHeight: '28px', fontWeight: 700 } as const;
const block = {
  padding: '16px 16px 24px',
  color: 'var(--label)',
  fontSize: 15,
  lineHeight: '20px',
};

// Every token of design/system/tokens.json, read from the file so this page cannot
// disagree with it. Colors show both themes side by side whatever the toolbar says.
function TokensPage() {
  return (
    <div style={block}>
      <h2 style={section}>Colors</h2>
      <Colors list={tokens.color.tokens} />
      {tokens.type.groups.map((group) => (
        <div key={group.name}>
          <h2 style={{ ...section, marginTop: 32 }}>{group.name}</h2>
          <TypeStyles styles={group.styles} />
        </div>
      ))}
      <h2 style={{ ...section, marginTop: 32 }}>Spacing</h2>
      <Lengths
        list={tokens.spacing.tokens}
        draw={(value) => ({ width: value, height: 12, background: 'var(--tint)' })}
      />
      <h2 style={{ ...section, marginTop: 32 }}>Radius</h2>
      <Lengths
        list={tokens.radius.tokens}
        draw={(value) => ({
          width: 40,
          height: 28,
          borderRadius: value,
          background: 'var(--fill)',
        })}
      />
      <h2 style={{ ...section, marginTop: 32 }}>Stroke</h2>
      <Lengths
        list={tokens.stroke.tokens}
        draw={(value) => ({ width: 40, height: value, background: 'var(--separator)' })}
      />
      <h2 style={{ ...section, marginTop: 32 }}>Shadow</h2>
      <Lengths
        list={tokens.shadow.tokens}
        draw={(value) => ({
          width: 40,
          height: 28,
          borderRadius: 8,
          background: 'var(--system-background)',
          boxShadow: value,
        })}
      />
    </div>
  );
}

const meta = {
  title: 'Foundations/Tokens',
  component: TokensPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TokensPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
