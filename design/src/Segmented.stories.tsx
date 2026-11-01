import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './Segmented.md?raw';
import { Segmented } from './Segmented.tsx';

const periods = [
  { key: 'w', label: 'W' },
  { key: 'm', label: 'M' },
  { key: '6m', label: '6M' },
  { key: 'y', label: 'Y' },
] as const;

const meta = {
  title: 'Entry/Segmented',
  component: Segmented,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: readme } },
    card: { layout: 'row', controlled: { value: 'value', onChange: 'onChange' } },
  },
  args: { items: periods, value: 'm', onChange: fn(), label: 'Period' },
} satisfies Meta<typeof Segmented<(typeof periods)[number]['key']>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};
