import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import readme from './Field.md?raw';
import { Field } from './Field.tsx';

type FieldArgs = Parameters<typeof Field>[0];

// The field is controlled, so typing writes back into the story's args and the Controls
// panel stays live.
function Writing(args: FieldArgs) {
  const [, updateArgs] = useArgs<FieldArgs>();
  return <Field {...args} onChange={(value) => updateArgs({ value })} />;
}

const meta = {
  title: 'Entry/Field',
  component: Field,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
  render: (args) => <Writing {...args} />,
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
