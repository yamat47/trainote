import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './Row.md?raw';
import { Row } from './Row.tsx';

const meta = {
  title: 'Lists/Row',
  component: Row,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Row>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WinWithNumbers: Story = {
  args: { kind: 'win', sub: 'ベンチプレス 60 kg × 10 × 3', children: 'ベンチ' },
};
export const Win: Story = { args: { kind: 'win', children: 'お菓子を我慢した' } };
export const Slip: Story = { args: { kind: 'slip', children: '夜更かしした' } };
export const WithDetail: Story = { args: { detail: '64.2 kg', children: 'Sun, Oct 26' } };
export const Navigable: Story = {
  args: { accessory: 'disclosure', onClick: fn(), children: 'Weekly review' },
};
export const Thread: Story = {
  args: {
    accessory: 'disclosure',
    detail: 'Oct 18',
    preview:
      '今週は Win が 9 件、Slip が 2 件でした。運動 3 回、食事の Win が 4 件と、食事が安定しています。体重は 65.0 kg から 64.2 kg へ。',
    onClick: fn(),
    children: 'Weekly review',
  },
};
export const Action: Story = {
  args: { tone: 'tint', accessory: 'disclosure', onClick: fn(), children: 'Show all entries' },
};
export const WithError: Story = {
  args: {
    tone: 'tint',
    onClick: fn(),
    error: 'Could not change the reminder. Try again.',
    children: 'Turn on the Sunday reminder',
  },
};
