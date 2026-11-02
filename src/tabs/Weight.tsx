import { useState, type Dispatch, type SetStateAction } from 'react';
import { Actions } from '../../design/src/Actions.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Field } from '../../design/src/Field.tsx';
import { Graph } from '../../design/src/Graph.tsx';
import { Inset } from '../../design/src/Inset.tsx';
import { List } from '../../design/src/List.tsx';
import { NavBar } from '../../design/src/NavBar.tsx';
import { Row } from '../../design/src/Row.tsx';
import { Segmented } from '../../design/src/Segmented.tsx';
import { Stat } from '../../design/src/Stat.tsx';
import { Text } from '../../design/src/Text.tsx';
import { ConfirmDelete } from '../ConfirmDelete.tsx';
import { dayLabel, monthLabel, monthOf } from '../dates.ts';
import { useDraft } from '../draft.ts';
import { Failed, SAVE_FAILED } from '../Failed.tsx';
import { runs } from '../groups.ts';
import { useLoaded } from '../loaded.ts';
import {
  correctDay,
  deleteDay,
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
  type Measurement,
  type PeriodKey,
  type Weight,
} from '../weights.ts';

const bodyFatLine = (row: Weight) =>
  row.bodyFatPct === null ? undefined : `Body fat ${pct(row.bodyFatPct)}`;

const byMonth = (rows: Weight[]) => runs(rows, (a, b) => monthOf(a.date) === monthOf(b.date));

const FAILED = 'Could not load your weights.';

// The address of the All entries screen pushed over the tab.
export const ALL_WEIGHTS = '/weight/all';

// The weights as they are after a save or a delete, from the row its response carries.
type Change = (after: (rows: Weight[]) => Weight[]) => void;

// The two fields of a day, and the request they make once they hold one the server takes.
type MeasurementKey = 'weight' | 'bodyFat';
const parse = (value: (key: MeasurementKey) => string) =>
  measurement(value('weight'), value('bodyFat'));
const EMPTY_FIELDS = { weight: '', bodyFat: '' };

type WeightProps = {
  // The tab itself, or the All entries screen pushed over it.
  allEntries: boolean;
  onShowAll: () => void;
  onBack: () => void;
};

export function WeightTab({ allEntries, onShowAll, onBack }: WeightProps) {
  const [period, setPeriod] = useState<PeriodKey>('m');
  const { shown, reload, replace } = useLoaded(loadWeights);
  const change: Change = (after) =>
    replace((current) => ({ ...current, weights: after(current.weights) }));

  if (allEntries) {
    return (
      <>
        <NavBar title="All entries" back={{ label: 'Weight', onClick: onBack }} />
        {shown.status === 'failed' ? <Failed message={FAILED} onRetry={reload} /> : null}
        {shown.status === 'ready' ? (
          <AllEntries rows={shown.weights} today={shown.today} onChange={change} />
        ) : null}
      </>
    );
  }

  // Nothing under the title until the weights are in: whether today's card belongs on the
  // page depends on them, and a card that came and went would move the page under a tap.
  return (
    <>
      <NavBar title="Weight" />
      {shown.status === 'failed' ? <Failed message={FAILED} onRetry={reload} /> : null}
      {shown.status === 'ready' ? (
        <>
          {shown.weights.some((row) => row.date === shown.today) ? null : (
            <TodayCard onSaved={(saved) => change((rows) => withSaved(rows, saved))} />
          )}
          <Segmented items={PERIODS} value={period} onChange={setPeriod} label="Period" />
          <Summary loaded={shown} period={period} onShowAll={onShowAll} onChange={change} />
        </>
      ) : null}
    </>
  );
}

type MeasurementFieldsProps = {
  draft: Pick<ReturnType<typeof useDraft<MeasurementKey, Measurement>>, 'value' | 'edit'>;
  // The day, as the weight's label.
  label: string;
  disabled: boolean;
  // A day the person opened in order to correct it.
  opened?: boolean;
};

function MeasurementFields({ draft, label, disabled, opened = false }: MeasurementFieldsProps) {
  return (
    <>
      <Field
        label={label}
        kind="numeric"
        unit="kg"
        value={draft.value('weight')}
        onChange={draft.edit('weight')}
        placeholder="0.0"
        disabled={disabled}
        // An opened day's caret goes to its weight; nothing takes focus that the person
        // did not ask for.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={opened}
      />
      <Field
        label="Body fat"
        kind="numeric"
        unit="%"
        value={draft.value('bodyFat')}
        onChange={draft.edit('bodyFat')}
        placeholder="0.0"
        disabled={disabled}
      />
    </>
  );
}

// Today's weight while the day has none: raised, so the morning's entry is the first thing
// on the page. Once saved, today is a row of the list, corrected there like any other day.
function TodayCard({ onSaved }: { onSaved: (saved: Weight) => void }) {
  const draft = useDraft({
    stored: EMPTY_FIELDS,
    parse,
    save: async (request) => onSaved(await saveToday(request)),
  });
  return (
    <>
      <Inset>
        <MeasurementFields draft={draft} label="Today" disabled={draft.saving} />
      </Inset>
      <Actions error={draft.failed ? SAVE_FAILED : undefined}>
        <Button
          variant="prominent"
          disabled={!draft.ready || draft.saving}
          onClick={() => void draft.submit()}
        >
          Save
        </Button>
      </Actions>
    </>
  );
}

type SummaryProps = {
  loaded: Loaded;
  period: PeriodKey;
  onShowAll: () => void;
  onChange: Change;
};

function Summary({ loaded, period, onShowAll, onChange }: SummaryProps) {
  const { weights, today, goal } = loaded;
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
      <RecentDays
        rows={weights.slice(0, 2)}
        today={today}
        onShowAll={onShowAll}
        onChange={onChange}
      />
    </>
  );
}

type RecentDaysProps = {
  rows: Weight[];
  today: string;
  onShowAll: () => void;
  onChange: Change;
};

// The last days and the way to all of them. The open day is kept here, so opening one
// redraws these rows and not the graph above.
function RecentDays({ rows, today, onShowAll, onChange }: RecentDaysProps) {
  const [open, setOpen] = useState<string>();
  return (
    <List>
      <Days rows={rows} today={today} open={open} onOpen={setOpen} onChange={onChange} />
      <Row tone="tint" accessory="disclosure" onClick={onShowAll}>
        Show all entries
      </Row>
    </List>
  );
}

type AllEntriesProps = { rows: Weight[]; today: string; onChange: Change };

function AllEntries({ rows, today, onChange }: AllEntriesProps) {
  // One day open across the months.
  const [open, setOpen] = useState<string>();
  return byMonth(rows).map((group) => (
    <List key={monthOf(group[0].date)} header={monthLabel(group[0].date, today)}>
      <Days rows={group} today={today} open={open} onOpen={setOpen} onChange={onChange} />
    </List>
  ));
}

type DaysProps = {
  rows: Weight[];
  today: string;
  // The date of the day open in place of its row.
  open: string | undefined;
  onOpen: Dispatch<SetStateAction<string | undefined>>;
  onChange: Change;
};

// Days as rows. A row opens in place to correct or delete the day; opening another closes
// it, and a save or a delete it sent still finishes.
function Days({ rows, today, open, onOpen, onChange }: DaysProps) {
  return rows.map((row) =>
    row.date === open ? (
      <DayEditor
        key={row.date}
        row={row}
        label={dayLabel(row.date, today)}
        onClose={() => onOpen(undefined)}
        onDone={(after) => {
          onOpen((date) => (date === row.date ? undefined : date));
          onChange(after);
        }}
      />
    ) : (
      <Row
        key={row.date}
        detail={kg(row.weightKg)}
        sub={bodyFatLine(row)}
        onClick={() => onOpen(row.date)}
      >
        {dayLabel(row.date, today)}
      </Row>
    ),
  );
}

// Deleting a day takes a second tap, on a button that is not where the first one was.
type Removal =
  { status: 'none' } | { status: 'confirming'; failed: boolean } | { status: 'deleting' };

type DayEditorProps = {
  row: Weight;
  // The day as its row names it, kept as the weight field's label.
  label: string;
  onClose: () => void;
  onDone: Change;
};

// A stored day open in place of its row: its weight and body fat in the fields, saved over
// the day or the day deleted.
function DayEditor({ row, label, onClose, onDone }: DayEditorProps) {
  const [removal, setRemoval] = useState<Removal>({ status: 'none' });
  const draft = useDraft({
    stored: measurementFields(row),
    parse,
    save: async (request) => {
      const saved = await correctDay(row.date, request);
      onDone((rows) => withSaved(rows, saved));
    },
  });

  const remove = async () => {
    setRemoval({ status: 'deleting' });
    try {
      await deleteDay(row.date);
      onDone((rows) => rows.filter((shown) => shown.date !== row.date));
    } catch {
      setRemoval({ status: 'confirming', failed: true });
    }
  };

  return (
    <>
      <MeasurementFields
        draft={draft}
        label={label}
        // The values do not matter to a delete, so they stay as they are until it is
        // cancelled.
        disabled={draft.saving || removal.status !== 'none'}
        opened
      />
      {removal.status === 'none' ? (
        <Actions align="split" error={draft.failed ? SAVE_FAILED : undefined}>
          <Button
            variant="destructive"
            disabled={draft.saving}
            onClick={() => setRemoval({ status: 'confirming', failed: false })}
          >
            Delete
          </Button>
          <Button disabled={draft.saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={draft.saving || !draft.ready} onClick={() => void draft.submit()}>
            Save
          </Button>
        </Actions>
      ) : (
        <ConfirmDelete
          deleting={removal.status === 'deleting'}
          failed={removal.status === 'confirming' && removal.failed}
          onCancel={() => setRemoval({ status: 'none' })}
          onDelete={() => void remove()}
        />
      )}
    </>
  );
}
