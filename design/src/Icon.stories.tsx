import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon.tsx';

// Framework7 Icons, the font the tab bar and the disclosure chevron draw from.
const meta = {
  title: 'Foundations/Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <span style={{ fontSize: 25, lineHeight: 1 }}>
        <Story />
      </span>
    ),
  ],
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Notes: Story = { args: { name: 'doc_text' } };
export const NotesActive: Story = { args: { name: 'doc_text_fill' } };
export const Chevron: Story = { args: { name: 'chevron_right' } };
