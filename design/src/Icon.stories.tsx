import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Icon.md?raw';
import { Icon } from './Icon.tsx';

const meta = {
  title: 'Foundations/Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: readme } },
    layout: 'padded',
    // The tab bar's size.
    card: { layout: 'row', fontSize: 25 },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Notes: Story = { args: { name: 'doc_text' } };
export const NotesActive: Story = { args: { name: 'doc_text_fill' } };
export const Chevron: Story = { args: { name: 'chevron_right' } };
