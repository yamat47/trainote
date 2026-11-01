import { Actions } from '../../design/src/Actions.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Field } from '../../design/src/Field.tsx';
import { Group } from '../../design/src/Group.tsx';
import {
  MAX_COACH_NOTES_LENGTH,
  MAX_EQUIPMENT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
} from '../../worker/profile-fields.ts';
import { useDraft, type Saving } from '../draft.ts';
import { Failed } from '../Failed.tsx';
import type { Shown } from '../loaded.ts';
import {
  about,
  aboutFields,
  coachNotes,
  goal,
  goalFields,
  notesFields,
  saveAbout,
  saveGoal,
  saveNotes,
  saveTraining,
  training,
  trainingFields,
  type Profile,
} from '../profile.ts';

type ProfileGroupsProps = {
  shown: Shown<Profile>;
  onRetry: () => void;
  onSaved: (fields: Partial<Profile>) => void;
};

// The groups of Profile the coach reads before every reply, in the order of the design:
// about you, the goal, training, and the notes. Each is saved on its own, so a group's
// Save never sends what another group's fields hold.
export function ProfileGroups({ shown, onRetry, onSaved }: ProfileGroupsProps) {
  if (shown.status === 'failed') {
    return (
      <Group>
        <Failed message="Could not load your profile." onRetry={onRetry} />
      </Group>
    );
  }
  const profile = shown.status === 'ready' ? shown : undefined;
  return (
    <>
      <AboutGroup profile={profile} onSaved={onSaved} />
      <GoalGroup profile={profile} onSaved={onSaved} />
      <TrainingGroup profile={profile} onSaved={onSaved} />
      <NotesGroup profile={profile} onSaved={onSaved} />
    </>
  );
}

// The stored profile, or nothing while it loads; and where the group's saved fields go.
type GroupProps = { profile: Profile | undefined; onSaved: (fields: Partial<Profile>) => void };

// Save, once something was typed over the loaded values, with the red line under it when
// the save failed.
function Save({ draft }: { draft: Saving }) {
  if (!draft.offered) return null;
  return (
    <Actions align="end" error={draft.failed ? 'Could not save. Try again.' : undefined}>
      <Button disabled={!draft.ready || draft.saving} onClick={() => void draft.submit()}>
        Save
      </Button>
    </Actions>
  );
}

function AboutGroup({ profile, onSaved }: GroupProps) {
  const draft = useDraft({
    stored: profile === undefined ? undefined : aboutFields(profile),
    parse: (value) => about(value('height'), value('born'), value('sex')),
    save: async (request) => onSaved(await saveAbout(request)),
  });
  return (
    <Group header="About you">
      <Field
        label="Height"
        kind="numeric"
        unit="cm"
        value={draft.value('height')}
        onChange={draft.edit('height')}
        placeholder="0"
        disabled={draft.saving}
      />
      <Field
        label="Born"
        kind="whole"
        value={draft.value('born')}
        onChange={draft.edit('born')}
        placeholder="Year"
        disabled={draft.saving}
      />
      <Field
        label="Sex"
        value={draft.value('sex')}
        onChange={draft.edit('sex')}
        placeholder="Not set"
        maxLength={MAX_SHORT_TEXT_LENGTH}
        disabled={draft.saving}
      />
      <Save draft={draft} />
    </Group>
  );
}

// The weight to reach and the day to reach it by, which the Weight graph draws as its
// goal line.
function GoalGroup({ profile, onSaved }: GroupProps) {
  const draft = useDraft({
    stored: profile === undefined ? undefined : goalFields(profile),
    parse: (value) => goal(value('weight'), value('deadline')),
    save: async (request) => onSaved(await saveGoal(request)),
  });
  return (
    <Group header="Goal">
      <Field
        label="Goal weight"
        kind="numeric"
        unit="kg"
        value={draft.value('weight')}
        onChange={draft.edit('weight')}
        placeholder="0.0"
        disabled={draft.saving}
      />
      <Field
        label="By"
        kind="date"
        value={draft.value('deadline')}
        onChange={draft.edit('deadline')}
        placeholder=""
        disabled={draft.saving}
      />
      <Save draft={draft} />
    </Group>
  );
}

function TrainingGroup({ profile, onSaved }: GroupProps) {
  const draft = useDraft({
    stored: profile === undefined ? undefined : trainingFields(profile),
    parse: (value) => training(value('where'), value('days'), value('equipment')),
    save: async (request) => onSaved(await saveTraining(request)),
  });
  return (
    <Group header="Training">
      <Field
        label="Where"
        value={draft.value('where')}
        onChange={draft.edit('where')}
        placeholder="Gym or home"
        maxLength={MAX_SHORT_TEXT_LENGTH}
        disabled={draft.saving}
      />
      <Field
        label="Days a week"
        kind="whole"
        value={draft.value('days')}
        onChange={draft.edit('days')}
        placeholder="Not set"
        disabled={draft.saving}
      />
      <Field
        label="Equipment"
        value={draft.value('equipment')}
        onChange={draft.edit('equipment')}
        placeholder="Not set"
        maxLength={MAX_EQUIPMENT_LENGTH}
        disabled={draft.saving}
      />
      <Save draft={draft} />
    </Group>
  );
}

// Whatever else the coach should keep in mind, in the person's own words. The footer
// speaks for the whole screen above it.
function NotesGroup({ profile, onSaved }: GroupProps) {
  const draft = useDraft({
    stored: profile === undefined ? undefined : notesFields(profile),
    parse: (value) => coachNotes(value('notes')),
    save: async (request) => onSaved(await saveNotes(request)),
  });
  return (
    <Group
      header="Notes for your coach"
      footer="Your coach reads everything above before every reply."
    >
      <Field
        kind="multiline"
        value={draft.value('notes')}
        onChange={draft.edit('notes')}
        placeholder="Injuries, habits, anything to keep in mind"
        ariaLabel="Notes for your coach"
        maxLength={MAX_COACH_NOTES_LENGTH}
        disabled={draft.saving}
      />
      <Save draft={draft} />
    </Group>
  );
}
