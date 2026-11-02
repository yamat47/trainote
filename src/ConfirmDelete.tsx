import { Actions } from '../design/src/Actions.tsx';
import { Button } from '../design/src/Button.tsx';

type ConfirmDeleteProps = {
  deleting: boolean;
  failed: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

// The second tap of a delete, in place of the buttons that offered it: Cancel comes where
// Delete was, so two taps on one spot delete nothing, and the red Delete entry is at the
// right.
export function ConfirmDelete({ deleting, failed, onCancel, onDelete }: ConfirmDeleteProps) {
  return (
    <Actions align="split" error={failed ? 'Could not delete. Try again.' : undefined}>
      <Button disabled={deleting} onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="destructive" disabled={deleting} onClick={onDelete}>
        Delete entry
      </Button>
    </Actions>
  );
}
