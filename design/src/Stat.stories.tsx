import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Stat.md?raw';
import { Stat } from './Stat.tsx';

const meta = {
  title: 'Numbers/Stat',
  component: Stat,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Today: Story = {
  args: { value: '64.2', unit: 'kg', label: 'Today', note: '−0.8 kg this week' },
};
export const FirstDay: Story = { args: { value: '64.2', unit: 'kg', label: 'Today' } };
