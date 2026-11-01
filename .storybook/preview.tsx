import type { Preview } from '@storybook/react-vite';
import 'framework7-icons/css/framework7-icons.css';
import '../design/src/tokens.css';
import '../design/src/components.css';
import { Framing } from './Framing.tsx';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Light or dark, as iOS would show it',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [Framing],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    options: {
      storySort: { order: ['Foundations', 'Navigation', 'Lists', 'Entry', 'Actions', 'Numbers'] },
    },
  },
};

export default preview;
