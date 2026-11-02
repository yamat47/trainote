import type { Meta, StoryObj } from '@storybook/react-vite';
import readme from './Inset.md?raw';
import { Field } from './Field.tsx';
import { Inset } from './Inset.tsx';
import { Row } from './Row.tsx';

const meta = {
  title: 'Lists/Inset',
  component: Inset,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: readme } } },
} satisfies Meta<typeof Inset>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    header: 'Read as 3 entries',
    children: (
      <>
        <Row kind="win" detail="Exercise" sub="ベンチプレス 60 kg × 10 × 3">
          ベンチ
        </Row>
        <Row kind="win" detail="Food">
          お菓子を我慢した
        </Row>
        <Row kind="slip" detail="Sleep">
          夜更かしした
        </Row>
      </>
    ),
  },
};

export const TodaysWeight: Story = {
  args: {
    children: (
      <>
        <Field
          label="Today"
          kind="numeric"
          unit="kg"
          value=""
          onChange={() => {}}
          placeholder="0.0"
        />
        <Field
          label="Body fat"
          kind="numeric"
          unit="%"
          value=""
          onChange={() => {}}
          placeholder="0.0"
        />
      </>
    ),
  },
};
