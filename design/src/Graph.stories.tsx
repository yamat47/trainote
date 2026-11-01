import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Graph.md?raw';
import { Graph } from './Graph.tsx';

// A month of mornings, a few skipped, falling towards the goal.
const weight = [
  65.2, 65.3, 65.0, 65.4, 65.1, 64.9, 65.0, 64.8, 64.9, 64.6, 64.7, 64.4, 64.5, 64.2,
].map((y, i) => ({ x: i * 2 + 3, y }));
const bodyFat = weight
  .filter((_, i) => i % 3 === 0)
  .map((p) => ({ x: p.x, y: 18 + (p.y - 64) * 2 }));

const meta = {
  title: 'Numbers/Graph',
  component: Graph,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
  args: {
    label: 'Weight over the last month, 65.2 to 64.2 kg, goal 60.0 kg',
    points: weight,
    to: 29,
    xLabels: [
      { x: 0, label: 'Sep 27' },
      { x: 14, label: 'Oct 11' },
      { x: 29, label: 'Oct 25' },
    ],
  },
} satisfies Meta<typeof Graph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithGoal: Story = { args: { goal: { y: 60, label: 'Goal 60.0' } } };
export const WithBodyFat: Story = {
  args: { secondary: bodyFat, goal: { y: 60, label: 'Goal 60.0' } },
};
export const NoGoal: Story = {};
