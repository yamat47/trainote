import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './ListHeader.md?raw';
import { ListHeader } from './ListHeader.tsx';

const meta = {
  title: 'Lists/ListHeader',
  component: ListHeader,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof ListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// The header above its rows is the List story.
export const Yesterday: Story = { args: { children: 'Yesterday' } };
export const ReadAs: Story = { name: 'Read as entries', args: { children: 'Read as 3 entries' } };
