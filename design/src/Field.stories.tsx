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
    kind: 'multiline',
    value: '',
    onChange: () => {},
    placeholder: 'What did you do today?',
    ariaLabel: 'New entry',
  },
};
export const Written: Story = {
  args: {
    kind: 'multiline',
    value: '23時に寝た。昼をサラダにした。駅まで歩いた2.5km。スクワット80kgで10、8、6。腹筋50回',
    onChange: () => {},
    placeholder: 'What did you do today?',
    ariaLabel: 'New entry',
  },
};
export const Labelled: Story = {
  args: {
    label: 'Today',
    kind: 'numeric',
    unit: 'kg',
    value: '',
    onChange: () => {},
    placeholder: '0.0',
  },
};
export const LabelledWritten: Story = {
  args: {
    label: 'Body fat',
    kind: 'numeric',
    unit: '%',
    value: '18.4',
    onChange: () => {},
    placeholder: '0.0',
  },
};
export const Date: Story = {
  args: { label: 'By', kind: 'date', value: '2027-03-31', onChange: () => {}, placeholder: '' },
};
