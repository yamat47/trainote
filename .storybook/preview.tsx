import type { Preview } from '@storybook/react-vite';
import 'framework7-icons/css/framework7-icons.css';
import '../design/src/tokens.css';
import '../design/src/components.css';
import { Themed, type Theme } from './Themed.tsx';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Light or dark, as iOS would show it',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => (
      <Themed theme={isTheme(context.globals['theme']) ? context.globals['theme'] : 'light'}>
        <Story />
      </Themed>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    options: {
      storySort: { order: ['Foundations', 'Navigation', 'Lists', 'Entry', 'Actions', 'Numbers'] },
    },
  },
};

export default preview;
