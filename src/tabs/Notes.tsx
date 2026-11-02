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
  deleteEntry,
  loadNotes,
  previewEntry,
  previewNote,
  replaceEntry,
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

// A saved entry rewritten in place of its row goes through a note's states, and two more
// for deleting it. Each keeps the text, so a failure leaves it as it was written.
type Edit =
  | Draft
  | { status: 'confirming'; text: string; failed: boolean }
  | { status: 'deleting'; text: string };

const READ_FAILED = 'Could not read your note. Try again.';
const SAVE_FAILED = 'Could not save. Try again.';
const DELETE_FAILED = 'Could not delete. Try again.';

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

// A saved entry as text to rewrite: the body, and under it the numbers as the row shows
// them, since the body leaves them out.
const editableText = (entry: Entry) =>
  [entry.body, measures(entry.items)].filter((line) => line !== undefined).join('\n');

// Entries are newest first already; consecutive rows of one day form a group.
const byDay = (entries: Entry[]) => runs(entries, (a, b) => a.date === b.date);

export function Notes() {
  const [draft, setDraft] = useState<Draft>({ status: 'writing', text: '', failed: false });
  // Reloaded after a save, so the new rows and the week's counts show up.
  const { shown, reload, replace } = useLoaded(loadNotes);
  // The saved entry open in place of its row. Opening another closes it; a save or a delete
  // it sent still finishes, and reloads the list.
  const [openId, setOpenId] = useState<number>();

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
          error={draft.status === 'writing' && draft.failed ? READ_FAILED : undefined}
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
          header={`Read as ${entriesWord(draft.preview.entries.length)}`}
          saveLabel={`Save ${entriesWord(draft.preview.entries.length)}`}
          saving={draft.status === 'saving'}
          failed={draft.status === 'previewed' && draft.failed}
          onEdit={() => edit(draft.text)}
          onSave={() => void save()}
        />
      )}
      {shown.status === 'ready'
        ? byDay(shown.entries).map((group) => (
            <List key={group[0].date} header={dayLabel(group[0].date, shown.week.today)}>
              {group.map((entry) =>
                openId === entry.id ? (
                  <EntryEditor
                    key={entry.id}
                    entry={entry}
                    onClose={() => setOpenId(undefined)}
                    onDone={(after) => {
                      setOpenId((open) => (open === entry.id ? undefined : open));
                      // The list changes at once; the reload brings the week's counts.
                      replace((loaded) => ({ ...loaded, entries: after(loaded.entries) }));
                      reload();
                    }}
                  />
                ) : (
                  <Row
                    key={entry.id}
                    kind={entry.kind}
                    sub={measures(entry.items)}
                    onClick={() => setOpenId(entry.id)}
                  >
                    {entry.body}
                  </Row>
                ),
              )}
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
  // The header over the rows in their inset group; an entry read again in place of its
  // row has none, and its row stays in the list.
  header?: string;
  saveLabel: string;
  saving: boolean;
  failed: boolean;
  onEdit: () => void;
  onSave: () => void;
};

function PreviewBlock({
  preview,
  header,
  saveLabel,
  saving,
  failed,
  onEdit,
  onSave,
}: PreviewBlockProps) {
  const empty = preview.entries.length === 0;
  const rows = preview.entries.map((entry, i) => (
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
  ));
  return (
    <>
      {empty ? <ListHeader>Nothing to save</ListHeader> : null}
      {!empty && header !== undefined ? <Inset header={header}>{rows}</Inset> : null}
      {!empty && header === undefined ? rows : null}
      <Text variant="subheadline">{preview.comment}</Text>
      <Actions error={failed ? SAVE_FAILED : undefined}>
        <Button disabled={saving} onClick={onEdit}>
          Edit text
        </Button>
        {empty ? null : (
          <Button variant="prominent" disabled={saving} onClick={onSave}>
            {saveLabel}
          </Button>
        )}
      </Actions>
    </>
  );
}

type EntryEditorProps = {
  entry: Entry;
  onClose: () => void;
  // The entry was saved or deleted; the list as it is now.
  onDone: (after: (entries: Entry[]) => Entry[]) => void;
};

// The row of a saved entry opened for rewriting: its text in the field, read again as one
// entry before it replaces the saved one, or deleted after a second tap that is not where
// the first one was.
function EntryEditor({ entry, onClose, onDone }: EntryEditorProps) {
  const { id } = entry;
  const [edit, setEdit] = useState<Edit>(() => ({
    status: 'writing',
    text: editableText(entry),
    failed: false,
  }));
  const { text } = edit;
  const write = (written: string) => setEdit({ status: 'writing', text: written, failed: false });

  const read = async () => {
    setEdit({ status: 'reading', text });
    try {
      setEdit({ status: 'previewed', text, preview: await previewEntry(text), failed: false });
    } catch {
      setEdit({ status: 'writing', text, failed: true });
    }
  };

  const save = async (preview: Preview) => {
    setEdit({ status: 'saving', text, preview });
    try {
      const [rewritten] = preview.entries;
      if (rewritten === undefined) throw new Error('the preview holds no entry');
      const saved = await replaceEntry(id, rewritten);
      onDone((entries) => entries.map((shown) => (shown.id === id ? saved : shown)));
    } catch {
      setEdit({ status: 'previewed', text, preview, failed: true });
    }
  };

  const remove = async () => {
    setEdit({ status: 'deleting', text });
    try {
      await deleteEntry(id);
      onDone((entries) => entries.filter((shown) => shown.id !== id));
    } catch {
      setEdit({ status: 'confirming', text, failed: true });
    }
  };

  const waiting =
    edit.status === 'reading' || edit.status === 'saving' || edit.status === 'deleting';
  return (
    <>
      <Field
        kind="multiline"
        value={text}
        onChange={write}
        placeholder="What did you do?"
        ariaLabel="Edit entry"
        maxLength={MAX_NOTE_LENGTH}
        disabled={waiting}
        // The row was tapped to rewrite it, so the caret goes there; nothing takes focus
        // that the person did not ask for.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      {edit.status === 'writing' || edit.status === 'reading' ? (
        <Actions
          align="split"
          error={edit.status === 'writing' && edit.failed ? READ_FAILED : undefined}
        >
          <Button
            variant="destructive"
            disabled={waiting}
            onClick={() => setEdit({ status: 'confirming', text, failed: false })}
          >
            Delete
          </Button>
          <Button disabled={waiting} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={waiting || text.trim() === ''} onClick={() => void read()}>
            Read as entry
          </Button>
        </Actions>
      ) : null}
      {edit.status === 'confirming' || edit.status === 'deleting' ? (
        <Actions
          align="split"
          error={edit.status === 'confirming' && edit.failed ? DELETE_FAILED : undefined}
        >
          <Button disabled={waiting} onClick={() => write(text)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={waiting} onClick={() => void remove()}>
            Delete entry
          </Button>
        </Actions>
      ) : null}
      {edit.status === 'previewed' || edit.status === 'saving' ? (
        <PreviewBlock
          preview={edit.preview}
          saveLabel="Save changes"
          saving={edit.status === 'saving'}
          failed={edit.status === 'previewed' && edit.failed}
          onEdit={() => write(text)}
          onSave={() => void save(edit.preview)}
        />
      ) : null}
    </>
  );
}
