import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './Screen.md?raw';
import { Group } from './Group.tsx';
import { List } from './List.tsx';
import { NavBar } from './NavBar.tsx';
import { Row } from './Row.tsx';
import { Screen } from './Screen.tsx';
import { TabBar } from './TabBar.tsx';

const items = [
  { key: 'notes', label: 'Notes', icon: 'doc_text', iconActive: 'doc_text_fill' },
  { key: 'weight', label: 'Weight', icon: 'chart_bar', iconActive: 'chart_bar_fill' },
  {
    key: 'coach',
    label: 'Coach',
    icon: 'bubble_left_bubble_right',
    iconActive: 'bubble_left_bubble_right_fill',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person_crop_circle',
    iconActive: 'person_crop_circle_fill',
  },
] as const;

const meta = {
  title: 'Navigation/Screen',
  component: Screen,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Screen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {
    tone: 'plain',
    tabBar: <TabBar items={items} active="notes" onChange={fn()} />,
    children: (
      <>
        <NavBar title="Notes" />
        <List header="Today">
          <Row kind="win">お菓子を我慢した</Row>
          <Row kind="slip">夜更かしした</Row>
        </List>
      </>
    ),
  },
};
export const Grouped: Story = {
  args: {
    tone: 'grouped',
    tabBar: <TabBar items={items} active="profile" onChange={fn()} />,
    children: (
      <>
        <NavBar title="Profile" />
        <Group header="Notifications" footer="The Sunday reminder arrives at 20:00.">
          <Row tone="tint" onClick={fn()}>
            Turn off the Sunday reminder
          </Row>
        </Group>
      </>
    ),
  },
};
