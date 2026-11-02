import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './Actions.md?raw';
import { Actions } from './Actions.tsx';
import { Button } from './Button.tsx';

const meta = {
  title: 'Actions/Actions',
  component: Actions,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Actions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fill: Story = {
  args: {
    children: (
      <>
        <Button onClick={fn()}>Edit text</Button>
        <Button variant="prominent" onClick={fn()}>
          Save 3 entries
        </Button>
      </>
    ),
  },
};
export const Split: Story = {
  args: {
    align: 'split',
    children: (
      <>
        <Button variant="destructive" onClick={fn()}>
          Delete
        </Button>
        <Button onClick={fn()}>Cancel</Button>
        <Button onClick={fn()}>Read as entry</Button>
      </>
    ),
  },
};
export const End: Story = {
  args: { align: 'end', children: <Button onClick={fn()}>Read as entries</Button> },
};
export const WithError: Story = {
  args: {
    align: 'end',
    error: 'Could not read your note. Try again.',
    children: <Button onClick={fn()}>Read as entries</Button>,
  },
};
