import { useState } from 'react';
import { Actions } from '../../design/src/Actions.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Field } from '../../design/src/Field.tsx';
import { Graph } from '../../design/src/Graph.tsx';
import { List } from '../../design/src/List.tsx';
import { Row } from '../../design/src/Row.tsx';
import { Segmented } from '../../design/src/Segmented.tsx';
import { Stat } from '../../design/src/Stat.tsx';
import { Text } from '../../design/src/Text.tsx';
import { dayLabel, monthLabel, monthOf } from '../dates.ts';
import { useDraft } from '../draft.ts';
import { Failed } from '../Failed.tsx';
import { runs } from '../groups.ts';
import { useLoaded, type Shown } from '../loaded.ts';
import {
  goalSentence,
  graphData,
  kg,
  loadWeights,
  measurement,
  measurementFields,
  PERIODS,
  pct,
  saveToday,
  weekLines,
  withSaved,
  type Loaded,
  type PeriodKey,
  type Weight,
} from '../weights.ts';

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
  const [period, setPeriod] = useState<PeriodKey>('m');
  const { shown, reload, replace } = useLoaded(loadWeights);
  const loaded = shown.status === 'ready' ? shown : undefined;
  const draft = useDraft({
    stored:
      loaded === undefined
        ? undefined
        : measurementFields(loaded.weights.find((row) => row.date === loaded.today)),
    parse: (value) => measurement(value('weight'), value('bodyFat')),
    save: async (request) => {
      const saved = await saveToday(request);
      replace((current) => ({ ...current, weights: withSaved(current.weights, saved) }));
    },
  });

  if (allEntries) {
    if (shown.status === 'failed') return <Failed message={FAILED} onRetry={reload} />;
    return shown.status === 'ready' ? (
      <AllEntries rows={shown.weights} today={shown.today} />
    ) : null;
  }

  return (
    <>
      <Field
        label="Today"
        kind="numeric"
        unit="kg"
        value={draft.value('weight')}
        onChange={draft.edit('weight')}
        placeholder="0.0"
        disabled={draft.saving}
      />
      <Field
        label="Body fat"
        kind="numeric"
        unit="%"
        value={draft.value('bodyFat')}
        onChange={draft.edit('bodyFat')}
        placeholder="0.0"
        disabled={draft.saving}
      />
      <Actions align="end" error={draft.failed ? 'Could not save. Try again.' : undefined}>
        {draft.offered ? (
          <Button disabled={!draft.ready || draft.saving} onClick={() => void draft.submit()}>
            Save
          </Button>
        ) : null}
      </Actions>
      <Segmented items={PERIODS} value={period} onChange={setPeriod} label="Period" />
      <Summary shown={shown} period={period} onRetry={reload} onShowAll={onShowAll} />
    </>
  );
}

type SummaryProps = {
  shown: Shown<Loaded>;
  period: PeriodKey;
  onRetry: () => void;
  onShowAll: () => void;
};

function Summary({ shown, period, onRetry, onShowAll }: SummaryProps) {
  if (shown.status === 'failed') return <Failed message={FAILED} onRetry={onRetry} />;
  if (shown.status === 'loading') return null;
  const { weights, today, goal } = shown;
  const [latest] = weights;
  if (latest === undefined) return <Text variant="footnote">Your weights will show here.</Text>;
  const { change, average } = weekLines(weights, today);
  const graph = graphData(weights, today, period, goal.goalWeightKg);
  const sentence = goalSentence(goal, latest);
  return (
    <>
      <Stat
        value={latest.weightKg.toFixed(1)}
        unit="kg"
        label={dayLabel(latest.date, today)}
        note={change}
      />
      {average === undefined ? null : <Text variant="footnote">{average}</Text>}
      {graph === undefined ? (
        <Text variant="footnote">Weigh in on another day to see the graph.</Text>
      ) : (
        <Graph {...graph} />
      )}
      {sentence === undefined ? null : <Text variant="footnote">{sentence}</Text>}
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
