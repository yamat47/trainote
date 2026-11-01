import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './Button.md?raw';
import { Button } from './Button.tsx';

const meta = {
  title: 'Actions/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Prominent: Story = { args: { variant: 'prominent', children: 'Save 3 entries' } };
export const Plain: Story = { args: { variant: 'plain', children: 'Edit text' } };
export const Disabled: Story = {
  args: { variant: 'prominent', disabled: true, children: 'Save 3 entries' },
};
