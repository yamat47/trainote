import { useState } from 'react';
import type { Category } from '../../worker/db/schema.ts';
import { MAX_NOTE_LENGTH } from '../../worker/note.ts';
import { Button } from '../components/Button.tsx';
import { Field } from '../components/Field.tsx';
import { ListHeader } from '../components/ListHeader.tsx';
import { Row } from '../components/Row.tsx';
import { previewNote, saveEntries, type DraftItem, type Preview } from '../notes.ts';

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

const entries = (n: number) => (n === 1 ? '1 entry' : `${String(n)} entries`);

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

const measures = (items: DraftItem[]) =>
  items.length === 0 ? undefined : items.map(describe).join('、');

export function Notes() {
  const [draft, setDraft] = useState<Draft>({ status: 'writing', text: '', failed: false });

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
    } catch {
      setDraft({ status: 'previewed', text, preview, failed: true });
    }
  };

  const busy = draft.status === 'reading' || draft.status === 'saving';
  const hasText = draft.text.trim() !== '';

  return (
    <>
      <Field
        value={draft.text}
        onChange={edit}
        placeholder="What did you do today?"
        ariaLabel="New entry"
        maxLength={MAX_NOTE_LENGTH}
        disabled={busy}
      />
      {draft.status === 'writing' || draft.status === 'reading' ? (
        <div className="app-note-actions">
          {draft.status === 'writing' && draft.failed ? (
            <output className="app-error app-note-error">
              Could not read your note. Try again.
            </output>
          ) : null}
          {hasText ? (
            <Button disabled={draft.status === 'reading'} onClick={() => void read()}>
              Read as entries
            </Button>
          ) : null}
        </div>
      ) : (
        <PreviewBlock
          preview={draft.preview}
          saving={draft.status === 'saving'}
          failed={draft.status === 'previewed' && draft.failed}
          onEdit={() => edit(draft.text)}
          onSave={() => void save()}
        />
      )}
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
      <ListHeader>{count === 0 ? 'Nothing to save' : `Read as ${entries(count)}`}</ListHeader>
      {count === 0 ? null : (
        <div className="app-preview">
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
        </div>
      )}
      <p className="app-comment">{preview.comment}</p>
      <div className="app-preview-actions">
        <Button disabled={saving} onClick={onEdit}>
          Edit text
        </Button>
        {count === 0 ? null : (
          <Button variant="prominent" disabled={saving} onClick={onSave}>
            Save {entries(count)}
          </Button>
        )}
      </div>
      {failed ? (
        <output className="app-error app-note-error">Could not save. Try again.</output>
      ) : null}
    </>
  );
}
