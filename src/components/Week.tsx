import type { Week as Counts } from '../../worker/entries.ts';
import { WEEKDAYS } from '../../worker/week.ts';
import { plural } from '../../worker/words.ts';

type WeekProps = { week?: Counts | undefined };

const BLANK = WEEKDAYS.map((label) => ({ label, wins: 0, slips: 0, today: false }));

// This week as seven columns of counts, the wins of each day above its slips. A day
// with nothing stays blank, so a gap in the row is a day nothing was written. Without
// counts yet, the seven columns stand empty so the page does not jump when they arrive.
export function Week({ week }: WeekProps) {
  const days =
    week === undefined
      ? BLANK
      : week.days.map((day, i) => ({
          label: WEEKDAYS[i] ?? '',
          wins: day.wins,
          slips: day.slips,
          today: day.date === week.today,
        }));
  return (
    <ul className="tn-week" aria-label="This week">
      {days.map((day) => (
        <li
          key={day.label}
          className={day.today ? 'tn-week-day tn-week-today' : 'tn-week-day'}
          aria-label={[
            day.label,
            day.wins === 0 ? undefined : plural(day.wins, 'win'),
            day.slips === 0 ? undefined : plural(day.slips, 'slip'),
          ]
            .filter((part) => part !== undefined)
            .join(', ')}
        >
          <span className="tn-week-label" aria-hidden="true">
            {day.label}
          </span>
          <span className="tn-week-wins" aria-hidden="true">
            {day.wins === 0 ? '' : `+${String(day.wins)}`}
          </span>
          <span className="tn-week-slips" aria-hidden="true">
            {day.slips === 0 ? '' : `−${String(day.slips)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
