import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Bubble.md?raw';
import { Bubble } from './Bubble.tsx';

const meta = {
  title: 'Chat/Bubble',
  component: Bubble,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } }, card: { layout: 'phones' } },
} satisfies Meta<typeof Bubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Me: Story = { args: { from: 'me', children: '今週の振り返りをして' } };
export const Coach: Story = {
  args: {
    from: 'coach',
    children:
      '今週は Win が 9 件、Slip が 2 件でした。運動 3 回、食事の Win が 4 件と、食事が安定しています。\n\n体重は 65.0 kg から 64.2 kg へ。目標の 60.0 kg まであと 4.2 kg です。\n\nSlip は 2 つとも睡眠でした。来週の方針は 1 つだけ。平日は 23 時に寝る日を 3 日つくりましょう。',
  },
};
