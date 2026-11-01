import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Mark.md?raw';
import { Mark } from './Mark.tsx';

const meta = {
  title: 'Lists/Mark',
  component: Mark,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } }, layout: 'padded' },
} satisfies Meta<typeof Mark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Win: Story = { args: { kind: 'win' } };
export const Slip: Story = { args: { kind: 'slip' } };
