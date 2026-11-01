export type WeekDay = { label: string; wins: number; slips: number; today: boolean };

type WeekProps = { days: WeekDay[]; label?: string };

// Its own copy: a design-system file depends on nothing under worker/ or src/.
const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

// This week as seven columns of counts, the wins of each day above its slips. A day
// with nothing stays blank, so a gap in the row is a day nothing was written.
export function Week({ days, label = 'This week' }: WeekProps) {
  return (
    <ul className="tn-week" aria-label={label}>
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
            {day.slips === 0 ? '' : `\u2212${String(day.slips)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
