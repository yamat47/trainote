import { useState } from 'react';
import { Actions } from '../../design/src/Actions.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Field } from '../../design/src/Field.tsx';
import { List } from '../../design/src/List.tsx';
import { Row } from '../../design/src/Row.tsx';
import { Stat } from '../../design/src/Stat.tsx';
import { Text } from '../../design/src/Text.tsx';
import { dayLabel, monthLabel, monthOf } from '../dates.ts';
import { Failed } from '../Failed.tsx';
import { runs } from '../groups.ts';
import { useLoaded, type Shown } from '../loaded.ts';
import {
  kg,
  loadWeights,
  measurement,
  pct,
  saveToday,
  weekLines,
  withSaved,
  type Weight,
  type Weights,
} from '../weights.ts';

// What the person typed over today's stored values; a field they have not touched
// shows the stored value, so a load arriving late cannot overwrite their typing.
type Draft = { weight?: string; bodyFat?: string; saving: boolean; failed: boolean };

const EMPTY: Draft = { saving: false, failed: false };

// The fields as the stored day fills them, "" for a value the day has not got.
const fromStored = (row: Weight | undefined) => {
  const fat = row?.bodyFatPct;
  return {
    weight: row === undefined ? '' : row.weightKg.toFixed(1),
    bodyFat: typeof fat === 'number' ? fat.toFixed(1) : '',
  };
};

const bodyFatLine = (row: Weight) =>
  row.bodyFatPct === null ? undefined : `Body fat ${pct(row.bodyFatPct)}`;

const byMonth = (rows: Weight[]) => runs(rows, (a, b) => monthOf(a.date) === monthOf(b.date));

const FAILED = 'Could not load your weights.';

type WeightProps = {
  // The tab itself, or the All entries screen pushed over it.
  allEntries: boolean;
  onShowAll: () => void;
};

export function WeightTab({ allEntries, onShowAll }: WeightProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const { shown, reload, replace } = useLoaded(loadWeights);

  if (allEntries) {
    if (shown.status === 'failed') return <Failed message={FAILED} onRetry={reload} />;
    return shown.status === 'ready' ? (
      <AllEntries rows={shown.weights} today={shown.today} />
    ) : null;
  }

  const loaded = shown.status === 'ready' ? shown : undefined;
  const stored = fromStored(loaded?.weights.find((row) => row.date === loaded.today));
  const weight = draft.weight ?? stored.weight;
  const bodyFat = draft.bodyFat ?? stored.bodyFat;
  const touched = draft.weight !== undefined || draft.bodyFat !== undefined;
  const ready = measurement(weight, bodyFat);

  const edit = (field: 'weight' | 'bodyFat') => (value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value, failed: false }));

  const save = async () => {
    if (ready === undefined) return;
    setDraft((prev) => ({ ...prev, saving: true, failed: false }));
    try {
      const saved = await saveToday(ready);
      setDraft(EMPTY);
      replace((current) => ({ ...current, weights: withSaved(current.weights, saved) }));
    } catch {
      setDraft((prev) => ({ ...prev, saving: false, failed: true }));
    }
  };

  return (
    <>
      <Field
        label="Today"
        numeric
        unit="kg"
        value={weight}
        onChange={edit('weight')}
        placeholder="0.0"
        disabled={draft.saving}
      />
      <Field
        label="Body fat"
        numeric
        unit="%"
        value={bodyFat}
        onChange={edit('bodyFat')}
        placeholder="0.0"
        disabled={draft.saving}
      />
      <Actions align="end" error={draft.failed ? 'Could not save. Try again.' : undefined}>
        {/* Only over today's stored values: a save before they arrived would drop the
            body fat the morning had. */}
        {loaded !== undefined && touched && (weight.trim() !== '' || bodyFat.trim() !== '') ? (
          <Button disabled={ready === undefined || draft.saving} onClick={() => void save()}>
            Save
          </Button>
        ) : null}
      </Actions>
      <Summary shown={shown} onRetry={reload} onShowAll={onShowAll} />
    </>
  );
}

type SummaryProps = { shown: Shown<Weights>; onRetry: () => void; onShowAll: () => void };

function Summary({ shown, onRetry, onShowAll }: SummaryProps) {
  if (shown.status === 'failed') return <Failed message={FAILED} onRetry={onRetry} />;
  if (shown.status === 'loading') return null;
  const { weights, today } = shown;
  const [latest] = weights;
  if (latest === undefined) return <Text variant="footnote">Your weights will show here.</Text>;
  const { change, average } = weekLines(weights, today);
  return (
    <>
      <Stat
        value={latest.weightKg.toFixed(1)}
        unit="kg"
        label={dayLabel(latest.date, today)}
        note={change}
      />
      {average === undefined ? null : <Text variant="footnote">{average}</Text>}
      <List>
        {weights.slice(0, 2).map((row) => (
          <Row key={row.date} detail={kg(row.weightKg)} sub={bodyFatLine(row)}>
            {dayLabel(row.date, today)}
          </Row>
        ))}
        <Row tone="tint" accessory="disclosure" onClick={onShowAll}>
          Show all entries
        </Row>
      </List>
    </>
  );
}

function AllEntries({ rows, today }: { rows: Weight[]; today: string }) {
  return byMonth(rows).map((group) => (
    <List key={monthOf(group[0].date)} header={monthLabel(group[0].date, today)}>
      {group.map((row) => (
        <Row key={row.date} detail={kg(row.weightKg)} sub={bodyFatLine(row)}>
          {dayLabel(row.date, today)}
        </Row>
      ))}
    </List>
  ));
}
