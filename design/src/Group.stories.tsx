import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Group.md?raw';
import { Group } from './Group.tsx';
import { Row } from './Row.tsx';

const meta = {
  title: 'Lists/Group',
  component: Group,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } }, card: { background: 'grouped' } },
} satisfies Meta<typeof Group>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Goal: Story = {
  args: {
    header: 'Goal',
    footer: 'Claude reads these before every reply.',
    children: (
      <>
        <Row detail="Mar 31, 2027" accessory="disclosure" onClick={() => {}}>
          Target date
        </Row>
        <Row detail="Gym">Where you train</Row>
      </>
    ),
  },
};
export const Notifications: Story = {
  args: {
    header: 'Notifications',
    footer: 'The Sunday reminder arrives at 20:00.',
    children: (
      <>
        <Row tone="tint" onClick={() => {}}>
          Turn off the Sunday reminder
        </Row>
        <Row tone="tint" onClick={() => {}}>
          Send a reminder now
        </Row>
      </>
    ),
  },
};
