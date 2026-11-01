import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Week.md?raw';
import { Week } from './Week.tsx';

const meta = {
  title: 'Numbers/Week',
  component: Week,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Week>;

export default meta;
type Story = StoryObj<typeof meta>;

const day = (label: string, wins = 0, slips = 0, today = false) => ({ label, wins, slips, today });

export const ThisWeek: Story = {
  args: {
    days: [
      day('Mon'),
      day('Tue', 1),
      day('Wed', 1),
      day('Thu', 1),
      day('Fri', 2),
      day('Sat', 2, 1),
      day('Sun', 2, 1, true),
    ],
  },
};
export const NothingYet: Story = {
  args: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => day(label)) },
};
