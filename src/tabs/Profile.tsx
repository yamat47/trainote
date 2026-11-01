import { useEffect, useState } from 'react';
import { Group } from '../components/Group.tsx';
import { Row } from '../components/Row.tsx';
import {
  reminderState,
  sendTestReminder,
  turnOff,
  turnOn,
  type ReminderState,
  type TestOutcome,
} from '../push.ts';

type State = ReminderState | 'loading';
type Failure = 'change' | 'test' | 'unsubscribed';
type Reminder = { state: State; busy: boolean; failed: Failure | undefined };
type Change = () => Promise<ReminderState>;

const footers: Record<State, string> = {
  loading: 'A reminder at 20:00 on Sundays to look back at the week with your coach.',
  off: 'A reminder at 20:00 on Sundays to look back at the week with your coach.',
  on: 'The Sunday reminder arrives at 20:00.',
  unsupported: 'Add trainote to your Home Screen to get the Sunday reminder.',
  denied: 'Notifications for trainote are turned off in Settings.',
};

export function Profile() {
  const [reminder, setReminder] = useState<Reminder>({
    state: 'loading',
    busy: false,
    failed: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const state = await reminderState().catch((): ReminderState => 'unsupported');
      if (!cancelled) setReminder({ state, busy: false, failed: undefined });
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const change = async (action: Change) => {
    if (reminder.busy) return;
    setReminder((current) => ({ ...current, busy: true, failed: undefined }));
    try {
      const state = await action();
      setReminder({ state, busy: false, failed: undefined });
    } catch {
      setReminder((current) => ({ ...current, busy: false, failed: 'change' }));
    }
  };

  const test = async () => {
    if (reminder.busy) return;
    setReminder((current) => ({ ...current, busy: true, failed: undefined }));
    try {
      const outcome = await sendTestReminder();
      setReminder((current) => ({ ...current, busy: false, failed: afterTest(outcome) }));
    } catch {
      setReminder((current) => ({ ...current, busy: false, failed: 'test' }));
    }
  };

  return (
    <Group header="Notifications" footer={footers[reminder.state]}>
      <ReminderRow
        state={reminder.state}
        failed={reminder.failed === 'change'}
        onChange={(action) => void change(action)}
      />
      {reminder.state === 'on' ? (
        <Row tone="tint" sub={testFailure(reminder.failed)} onClick={() => void test()}>
          Send a reminder now
        </Row>
      ) : null}
    </Group>
  );
}

// The error line sits directly under the row it concerns, as its second line.
const failure = (failed: boolean, words: string) =>
  failed ? <span className="app-error">{words}</span> : undefined;

const afterTest = (outcome: TestOutcome): Failure | undefined => {
  if (outcome === 'sent') return undefined;
  return outcome === 'failed' ? 'test' : 'unsubscribed';
};

const testFailure = (failed: Failure | undefined) => {
  if (failed === 'test') return failure(true, 'Could not send a reminder. Try again.');
  if (failed === 'unsubscribed') {
    return failure(true, 'This device is not subscribed. Turn the reminder off and on.');
  }
  return undefined;
};

type ReminderRowProps = { state: State; failed: boolean; onChange: (action: Change) => void };

function ReminderRow({ state, failed, onChange }: ReminderRowProps) {
  const error = failure(failed, 'Could not change the reminder. Try again.');
  if (state === 'off') {
    return (
      <Row tone="tint" sub={error} onClick={() => onChange(turnOn)}>
        Turn on the Sunday reminder
      </Row>
    );
  }
  if (state === 'on') {
    return (
      <Row tone="tint" sub={error} onClick={() => onChange(turnOff)}>
        Turn off the Sunday reminder
      </Row>
    );
  }
  if (state === 'loading') return <Row>Sunday reminder</Row>;
  return <Row detail="Off">Sunday reminder</Row>;
}
