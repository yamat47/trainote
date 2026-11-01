import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Field.md?raw';
import { Field } from './Field.tsx';

const meta = {
  title: 'Entry/Field',
  component: Field,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: readme } },
    card: { controlled: { value: 'value', onChange: 'onChange' } },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    value: '',
    onChange: () => {},
    placeholder: 'What did you do today?',
    ariaLabel: 'New entry',
  },
};
export const Written: Story = {
  args: {
    value: '23時に寝た。昼をサラダにした。駅まで歩いた2.5km。スクワット80kgで10、8、6。腹筋50回',
    onChange: () => {},
    placeholder: 'What did you do today?',
    ariaLabel: 'New entry',
  },
};
