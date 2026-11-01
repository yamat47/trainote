import { Actions } from '../../design/src/Actions.tsx';
import { Button } from '../../design/src/Button.tsx';
import { Field } from '../../design/src/Field.tsx';
import { Group } from '../../design/src/Group.tsx';
import { Row } from '../../design/src/Row.tsx';
import { useDraft } from '../draft.ts';
import { Failed } from '../Failed.tsx';
import type { Shown } from '../loaded.ts';
import { goal, goalFields, saveGoal, type Profile } from '../profile.ts';

type GoalGroupProps = {
  shown: Shown<Profile>;
  onRetry: () => void;
  onSaved: (profile: Profile) => void;
};

// The Goal group of Profile: the weight to reach and the day to reach it by, which the
// Weight graph draws as its goal line and Claude reads before every reply.
export function GoalGroup({ shown, onRetry, onSaved }: GoalGroupProps) {
  const draft = useDraft({
    stored: shown.status === 'ready' ? goalFields(shown) : undefined,
    parse: (value) => goal(value('weight'), value('deadline')),
    save: async (request) => onSaved(await saveGoal(request)),
  });
  return (
    <Group header="Goal" footer="Claude reads these before every reply.">
      {shown.status === 'failed' ? (
        <Row>
          <Failed message="Could not load your goal." onRetry={onRetry} />
        </Row>
      ) : (
        <>
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
          {draft.offered ? (
            <Actions align="end" error={draft.failed ? 'Could not save. Try again.' : undefined}>
              <Button disabled={!draft.ready || draft.saving} onClick={() => void draft.submit()}>
                Save
              </Button>
            </Actions>
          ) : null}
        </>
      )}
    </Group>
  );
}
