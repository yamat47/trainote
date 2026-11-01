import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import readme from './TabBar.md?raw';
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
  title: 'Navigation/TabBar',
  component: TabBar,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
  args: { items, active: 'notes', onChange: fn() },
} satisfies Meta<typeof TabBar<(typeof items)[number]['key']>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotesSelected: Story = {};
export const ProfileSelected: Story = { args: { active: 'profile' } };
