import { Actions } from '../design/src/Actions.tsx';
import { Button } from '../design/src/Button.tsx';
import { Text } from '../design/src/Text.tsx';

// The line under a Save whose save failed, on every tab.
export const SAVE_FAILED = 'Could not save. Try again.';

// What a tab shows where its data would be when the load failed: the red line and the
// way to try again. The entry rows above it stay usable.
export function Failed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <Text variant="caption-1" tone="error">
        {message}
      </Text>
      <Actions align="end">
        <Button onClick={onRetry}>Try again</Button>
      </Actions>
    </>
  );
}
