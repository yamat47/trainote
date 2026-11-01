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
  on: 'Sent at 20:00 on Sundays.',
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
    <>
      <Group header="Notifications" footer={footers[reminder.state]}>
        <ReminderRow state={reminder.state} onChange={(action) => void change(action)} />
      </Group>
      {reminder.failed ? (
        <p className="app-error">Could not change the reminder. Try again.</p>
      ) : null}
    </>
  );
}

type ReminderRowProps = { state: State; onChange: (action: Change) => void };

function ReminderRow({ state, onChange }: ReminderRowProps) {
  if (state === 'off') {
    return (
      <Row tone="tint" onClick={() => onChange(turnOn)}>
        Turn on the Sunday reminder
      </Row>
    );
  }
  if (state === 'on') {
    return (
      <Row tone="tint" onClick={() => onChange(turnOff)}>
        Turn off the Sunday reminder
      </Row>
    );
  }
  if (state === 'loading') return <Row>Sunday reminder</Row>;
  return <Row detail="Off">Sunday reminder</Row>;
}
