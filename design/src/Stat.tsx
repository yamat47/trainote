type StatProps = {
  value: string;
  unit?: string;
  label: string;
  // The sentence beside the number: the change since last week.
  note?: string | undefined;
};

// A big number with its unit and label: today's weight at the top of Weight, with the
// day under it and the week's change beside it.
export function Stat({ value, unit, label, note }: StatProps) {
  return (
    <div className="tn-stat">
      <div className="tn-stat-main">
        <p className="tn-stat-value">
          {value}
          {unit === undefined ? null : <span className="tn-stat-unit">{unit}</span>}
        </p>
        <p className="tn-stat-label">{label}</p>
      </div>
      {note === undefined ? null : <p className="tn-stat-note">{note}</p>}
    </div>
  );
}
