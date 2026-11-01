import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './NavBar.md?raw';
import { Button } from './Button.tsx';
import { NavBar } from './NavBar.tsx';

const meta = {
  title: 'Navigation/NavBar',
  component: NavBar,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Title: Story = { args: { title: 'Notes' } };
export const WithAction: Story = {
  args: { title: 'Notes', trailing: <Button onClick={() => {}}>Filter</Button> },
};
