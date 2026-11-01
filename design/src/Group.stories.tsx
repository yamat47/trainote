import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field } from './Field.tsx';
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
    children: (
      <>
        <Field
          label="Goal weight"
          kind="numeric"
          unit="kg"
          value="60.0"
          onChange={() => {}}
          placeholder="0.0"
        />
        <Field label="By" kind="date" value="2027-03-31" onChange={() => {}} placeholder="" />
      </>
    ),
  },
};
export const AboutYou: Story = {
  args: {
    header: 'About you',
    children: (
      <>
        <Field
          label="Height"
          kind="numeric"
          unit="cm"
          value="172"
          onChange={() => {}}
          placeholder="0"
        />
        <Field label="Born" kind="whole" value="1990" onChange={() => {}} placeholder="Year" />
        <Field label="Sex" value="" onChange={() => {}} placeholder="Not set" />
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
