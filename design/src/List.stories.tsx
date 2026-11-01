import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './List.md?raw';
import { List } from './List.tsx';
import { Row } from './Row.tsx';

const meta = {
  title: 'Lists/List',
  component: List,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Today: Story = {
  args: {
    header: 'Today',
    children: (
      <>
        <Row kind="win" sub="ベンチプレス 60 kg × 10 × 3">
          ベンチ
        </Row>
        <Row kind="win">お菓子を我慢した</Row>
        <Row kind="slip">夜更かしした</Row>
      </>
    ),
  },
};
