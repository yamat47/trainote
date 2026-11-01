import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from '../system/components/ListHeader/README.md?raw';
import { ListHeader } from './ListHeader.tsx';
import { Row } from './Row.tsx';

const meta = {
  title: 'Lists/ListHeader',
  component: ListHeader,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof ListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Yesterday: Story = {
  args: { children: 'Yesterday' },
  render: (args) => (
    <>
      <ListHeader {...args} />
      <Row kind="win">23 時に寝た</Row>
      <Row kind="slip">ジムをサボった</Row>
    </>
  ),
};
