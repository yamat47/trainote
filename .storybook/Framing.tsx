import type { Decorator } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { useArgs } from 'storybook/preview-api';
import { card, type Card } from './card.ts';
import { Themed, type Theme } from './Themed.tsx';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

// The frame a story's card gives it, from the same `parameters.card`: the row, the phone
// column, the grouped page, the text size.
function Framed({ card: frame, children }: { card: Card; children: ReactNode }) {
  const style: CSSProperties = {
    ...(frame.layout === 'row'
      ? { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 16px' }
      : {}),
    ...(frame.layout === 'phones' ? { width: 390 } : {}),
    ...(frame.background === 'grouped'
      ? { background: 'var(--grouped-background)', paddingBottom: 16 }
      : {}),
    ...(frame.fontSize === undefined ? {} : { fontSize: frame.fontSize, lineHeight: 1 }),
  };
  return <div style={style}>{children}</div>;
}

// Themes and frames every story, from the toolbar and from `parameters.card`. A controlled
// component's change is written back into the args, so the story can be used and the
// Controls panel stays live; Storybook's hooks run only here, in the decorator itself.
export const Framing: Decorator = (Story, context) => {
  const [args, updateArgs] = useArgs<Record<string, unknown>>();
  const frame = card(context.parameters, context.title);
  const controlled = frame.controlled;
  const live =
    controlled === undefined
      ? args
      : {
          ...args,
          [controlled.onChange]: (value: unknown) => updateArgs({ [controlled.value]: value }),
        };
  return (
    <Themed theme={isTheme(context.globals['theme']) ? context.globals['theme'] : 'light'}>
      <Framed card={frame}>
        <Story args={live} />
      </Framed>
    </Themed>
  );
};
