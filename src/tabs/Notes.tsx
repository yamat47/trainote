import { useState } from 'react';
import type { Category } from '../../worker/db/schema.ts';
import { MAX_NOTE_LENGTH } from '../../worker/note.ts';
import { WEEKDAYS } from '../../worker/week.ts';
import { plural, weekPhrase } from '../../worker/words.ts';
import { Actions } from '../../design/src/Actions.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Field } from '../../design/src/Field.tsx';
import { Inset } from '../../design/src/Inset.tsx';
import { List } from '../../design/src/List.tsx';
import { ListHeader } from '../../design/src/ListHeader.tsx';
import { NavBar } from '../../design/src/NavBar.tsx';
import { Row } from '../../design/src/Row.tsx';
import { Text } from '../../design/src/Text.tsx';
import { Week, type WeekDay } from '../../design/src/Week.tsx';
import { dayLabel } from '../dates.ts';
import { Failed } from '../Failed.tsx';
import { runs } from '../groups.ts';
import { useLoaded, type Shown } from '../loaded.ts';
import {
  loadNotes,
  previewNote,
  saveEntries,
  type DraftItem,
  type Entry,
  type Notes as Loaded,
  type Preview,
  type Week as Counts,
} from '../notes.ts';

type Draft =
  | { status: 'writing'; text: string; failed: boolean }
  | { status: 'reading'; text: string }
  | { status: 'previewed'; text: string; preview: Preview; failed: boolean }
  | { status: 'saving'; text: string; preview: Preview };

const CATEGORY_LABELS: Record<Category, string> = {
  exercise: 'Exercise',
  food: 'Food',
  sleep: 'Sleep',
  life: 'Life',
};

const entriesWord = (n: number) => (n === 1 ? '1 entry' : `${String(n)} entries`);

// "ベンチプレス 60 kg × 10 × 3", "ウォーキング 2.5 km": the exercise, then the numbers
// the note gave, in the order weight, reps, sets, time, distance.
function describe(item: DraftItem): string {
  const lifted = [
    item.weightKg === null ? undefined : `${String(item.weightKg)} kg`,
    item.reps === null ? undefined : String(item.reps),
    item.sets === null ? undefined : String(item.sets),
  ].filter((part) => part !== undefined);
  return [
    item.exercise,
    lifted.length === 0 ? undefined : lifted.join(' × '),
    item.durationMin === null ? undefined : `${String(item.durationMin)} min`,
    item.distanceKm === null ? undefined : `${String(item.distanceKm)} km`,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
}

const onlyReps = (item: DraftItem) =>
  item.reps !== null && item.sets === null && item.durationMin === null && item.distanceKm === null;

// Items that differ only in reps are one set group written out: "60kg で 10、8、6".
const sameSetGroup = (a: DraftItem, b: DraftItem) =>
  a.exercise === b.exercise && a.weightKg === b.weightKg && onlyReps(a) && onlyReps(b);

// The items of an entry in one line, "ベンチプレス 60 kg × 10 × 3、スクワット 80 kg × 10、8、6":
// a run of items that differ only in reps folds back into the phrase the note used.
function measures(items: DraftItem[]): string | undefined {
  if (items.length === 0) return undefined;
  return runs(items, sameSetGroup)
    .map((group) => {
      const [lead] = group;
      if (group.length < 2) return describe(lead);
      const weight = lead.weightKg === null ? '' : ` ${String(lead.weightKg)} kg`;
      const reps = group.map((item) => item.reps).filter((n) => n !== null);
      return `${lead.exercise}${weight} × ${reps.map(String).join('、')}`;
    })
    .join('、');
}

// The week in the words of the design: the counts, then the run when there is one to
// speak of. A week without a note gets an invitation rather than "0 wins and 0 slips".
function weekSentence(week: Counts): string {
  const wins = week.days.reduce((sum, day) => sum + day.wins, 0);
  const slips = week.days.reduce((sum, day) => sum + day.slips, 0);
  const phrase = weekPhrase(wins, slips) ?? 'Nothing this week yet';
  // The run survives a week boundary as it survives midnight, so Monday morning still
  // says what the person is keeping up.
  return week.streak >= 2 ? `${phrase}, ${plural(week.streak, 'day')} in a row.` : `${phrase}.`;
}

// The strip's seven columns from the server's week; empty until the counts arrive so the
// page does not jump.
const BLANK_WEEK: WeekDay[] = WEEKDAYS.map((label) => ({
  label,
  wins: 0,
  slips: 0,
  today: false,
}));

const weekDays = (week: Counts): WeekDay[] =>
  week.days.map((day, i) => ({
    label: WEEKDAYS[i] ?? '',
    wins: day.wins,
    slips: day.slips,
    today: day.date === week.today,
  }));

// Entries are newest first already; consecutive rows of one day form a group.
const byDay = (entries: Entry[]) => runs(entries, (a, b) => a.date === b.date);

export function Notes() {
  const [draft, setDraft] = useState<Draft>({ status: 'writing', text: '', failed: false });
  // Reloaded after a save, so the new rows and the week's counts show up.
  const { shown, reload } = useLoaded(loadNotes);

  // Typing after a preview starts over: the preview belonged to the old text.
  const edit = (text: string) => setDraft({ status: 'writing', text, failed: false });

  const read = async () => {
    if (draft.status !== 'writing') return;
    const { text } = draft;
    setDraft({ status: 'reading', text });
    try {
      const preview = await previewNote(text);
      setDraft({ status: 'previewed', text, preview, failed: false });
    } catch {
      setDraft({ status: 'writing', text, failed: true });
    }
  };

  const save = async () => {
    if (draft.status !== 'previewed') return;
    const { text, preview } = draft;
    setDraft({ status: 'saving', text, preview });
    try {
      await saveEntries(preview.entries);
      setDraft({ status: 'writing', text: '', failed: false });
      reload();
    } catch {
      setDraft({ status: 'previewed', text, preview, failed: true });
    }
  };

  const busy = draft.status === 'reading' || draft.status === 'saving';
  const hasText = draft.text.trim() !== '';

  return (
    <>
      <NavBar title="Notes" />
      <WeekBlock shown={shown} onRetry={reload} />
      <Field
        kind="multiline"
        value={draft.text}
        onChange={edit}
        placeholder="What did you do today?"
        ariaLabel="New entry"
        maxLength={MAX_NOTE_LENGTH}
        disabled={busy}
      />
      {draft.status === 'writing' || draft.status === 'reading' ? (
        <Actions
          align="end"
          error={
            draft.status === 'writing' && draft.failed
              ? 'Could not read your note. Try again.'
              : undefined
          }
        >
          {hasText ? (
            <Button disabled={draft.status === 'reading'} onClick={() => void read()}>
              Read as entries
            </Button>
          ) : null}
        </Actions>
      ) : (
        <PreviewBlock
          preview={draft.preview}
          saving={draft.status === 'saving'}
          failed={draft.status === 'previewed' && draft.failed}
          onEdit={() => edit(draft.text)}
          onSave={() => void save()}
        />
      )}
      {shown.status === 'ready'
        ? byDay(shown.entries).map((group) => (
            <List key={group[0].date} header={dayLabel(group[0].date, shown.week.today)}>
              {group.map((entry) => (
                <Row key={entry.id} kind={entry.kind} sub={measures(entry.items)}>
                  {entry.body}
                </Row>
              ))}
            </List>
          ))
        : null}
    </>
  );
}

type WeekBlockProps = { shown: Shown<Loaded>; onRetry: () => void };

function WeekBlock({ shown, onRetry }: WeekBlockProps) {
  if (shown.status === 'failed') {
    return (
      <>
        <Week days={BLANK_WEEK} />
        <Failed message="Could not load your notes." onRetry={onRetry} />
      </>
    );
  }
  const week = shown.status === 'ready' ? shown.week : undefined;
  return (
    <>
      <Week days={week === undefined ? BLANK_WEEK : weekDays(week)} />
      <Text variant="footnote">{week === undefined ? '' : weekSentence(week)}</Text>
    </>
  );
}

type PreviewBlockProps = {
  preview: Preview;
  saving: boolean;
  failed: boolean;
  onEdit: () => void;
  onSave: () => void;
};

function PreviewBlock({ preview, saving, failed, onEdit, onSave }: PreviewBlockProps) {
  const count = preview.entries.length;
  return (
    <>
      {count === 0 ? (
        <ListHeader>Nothing to save</ListHeader>
      ) : (
        <Inset header={`Read as ${entriesWord(count)}`}>
          {preview.entries.map((entry, i) => (
            <Row
              // The preview has no ids; a row is its place in the list.
              // oxlint-disable-next-line react/no-array-index-key
              key={i}
              kind={entry.kind}
              detail={CATEGORY_LABELS[entry.category]}
              sub={measures(entry.items)}
            >
              {entry.body}
            </Row>
          ))}
        </Inset>
      )}
      <Text variant="subheadline">{preview.comment}</Text>
      <Actions error={failed ? 'Could not save. Try again.' : undefined}>
        <Button disabled={saving} onClick={onEdit}>
          Edit text
        </Button>
        {count === 0 ? null : (
          <Button variant="prominent" disabled={saving} onClick={onSave}>
            Save {entriesWord(count)}
          </Button>
        )}
      </Actions>
    </>
  );
}
