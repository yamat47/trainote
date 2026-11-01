import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Text.md?raw';
import { Text } from './Text.tsx';

const meta = {
  title: 'Lists/Text',
  component: Text,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Footnote: Story = {
  args: { variant: 'footnote', children: '9 wins and 2 slips this week, 6 days in a row.' },
};
export const Subheadline: Story = {
  args: { variant: 'subheadline', children: 'お菓子を我慢できたのは大きいです。' },
};
export const WithError: Story = {
  args: { variant: 'caption-1', tone: 'error', children: 'Could not save. Try again.' },
};
