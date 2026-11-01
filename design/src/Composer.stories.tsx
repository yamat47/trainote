import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './Composer.md?raw';
import { Composer } from './Composer.tsx';

const meta = {
  title: 'Chat/Composer',
  component: Composer,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: readme } },
    card: { layout: 'phones', controlled: { value: 'value', onChange: 'onChange' } },
  },
  args: { value: '', onChange: fn(), onSend: fn() },
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Written: Story = {
  args: { value: '来週は脚の日を 2 回にしたい。\nメニューを組んで' },
};
export const Answering: Story = { args: { disabled: true } };
export const WithError: Story = {
  args: { value: '脚の日のメニューを組んで', error: 'Could not send. Try again.' },
};
