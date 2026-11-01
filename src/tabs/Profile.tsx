import { useEffect, useState } from 'react';
import { Group } from '../components/Group.tsx';
import { Row } from '../components/Row.tsx';
import { reminderState, turnOff, turnOn, type ReminderState } from '../push.ts';

type State = ReminderState | 'loading';
type Reminder = { state: State; busy: boolean; failed: boolean };
type Change = () => Promise<ReminderState>;

const footers: Record<State, string> = {
  loading: 'A reminder at 20:00 on Sundays to look back at the week with your coach.',
  off: 'A reminder at 20:00 on Sundays to look back at the week with your coach.',
  on: 'The Sunday reminder is on.',
  unsupported: 'Add trainote to your Home Screen to get the Sunday reminder.',
  denied: 'Notifications for trainote are turned off in Settings.',
};

export function Profile() {
  const [reminder, setReminder] = useState<Reminder>({
    state: 'loading',
    busy: false,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const state = await reminderState().catch((): ReminderState => 'unsupported');
      if (!cancelled) setReminder({ state, busy: false, failed: false });
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const change = async (action: Change) => {
    if (reminder.busy) return;
    setReminder((current) => ({ ...current, busy: true, failed: false }));
    try {
      const state = await action();
      setReminder({ state, busy: false, failed: false });
    } catch {
      setReminder((current) => ({ ...current, busy: false, failed: true }));
    }
  };

  return (
    <Group header="Notifications" footer={footers[reminder.state]}>
      <ReminderRow
        state={reminder.state}
        failed={reminder.failed}
        onChange={(action) => void change(action)}
      />
    </Group>
  );
}

type ReminderRowProps = { state: State; failed: boolean; onChange: (action: Change) => void };

function ReminderRow({ state, failed, onChange }: ReminderRowProps) {
  // The error line sits directly under the row it concerns, as its second line.
  const error = failed ? (
    <span className="app-error">Could not change the reminder. Try again.</span>
  ) : undefined;
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
