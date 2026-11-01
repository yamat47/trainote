export type GraphPoint = { x: number; y: number };

export type GraphProps = {
  // What a screen reader hears instead of the picture.
  label: string;
  // The measurement, in tint against the right axis, ending in a dot.
  points: GraphPoint[];
  // A second measurement in secondary-label against a left axis, when there is one.
  secondary?: GraphPoint[] | undefined;
  // The x range of the plot, from 0; points beyond it are not drawn.
  to: number;
  // The dates written under the plot, at their x.
  xLabels: { x: number; label: string }[];
  // The dashed red line on the right axis, with its words.
  goal?: { y: number; label: string } | undefined;
};

const WIDTH = 358;
const HEIGHT = 236;
const TOP = 20;
const BOTTOM = 220;
const RIGHT = 322;
const LEFT_AXIS = 36;

// Ticks at a round step, five or so across the values, reaching past both ends. Flat
// values are widened to a span of one, so a quiet week still has a scale.
function ticks(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const mid = (min + max) / 2;
  const raw = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / magnitude;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * magnitude;
  const lo = Math.floor((mid - span / 2) / step) * step;
  const hi = Math.ceil((mid + span / 2) / step) * step;
  const out: number[] = [];
  for (let tick = lo; tick <= hi + step / 2; tick += step) out.push(Number(tick.toFixed(2)));
  return out;
}

const scale = (lo: number, hi: number, fromPx: number, toPx: number) => (value: number) =>
  fromPx + ((value - lo) / (hi - lo)) * (toPx - fromPx);

// An axis: its round ticks and the pixel each value lands on.
function axis(values: number[]) {
  const marks = ticks(values);
  return { ticks: marks, y: scale(marks[0] ?? 0, marks.at(-1) ?? 1, BOTTOM, TOP) };
}

// A line graph in the system's one style: a tint line over hairline gridlines, axis
// labels in footnote on secondary-label, the goal as a dashed red line; nothing filled,
// nothing animated. Points are days on the x axis and measurements on the y axis.
export function Graph({ label, points, secondary, to, xLabels, goal }: GraphProps) {
  const left = secondary === undefined ? 0 : LEFT_AXIS;
  const x = scale(0, to, left, RIGHT);
  const right = axis([...points.map((p) => p.y), ...(goal === undefined ? [] : [goal.y])]);
  const other = secondary === undefined ? undefined : axis(secondary.map((p) => p.y));
  const path = (line: GraphPoint[], y: (v: number) => number) =>
    line
      .filter((p) => p.x >= 0 && p.x <= to)
      .map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`)
      .join(' ');
  const last = points.findLast((p) => p.x >= 0 && p.x <= to);
  return (
    <figure className="tn-graph">
      {/* An <img> cannot draw this; the role tells a screen reader to read the label and
          skip the shapes. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <svg viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`} role="img" aria-label={label}>
        <g className="tn-graph-grid">
          {right.ticks.map((tick) => (
            <line key={tick} x1={left} y1={right.y(tick)} x2={RIGHT} y2={right.y(tick)} />
          ))}
        </g>
        <g className="tn-graph-axis">
          {right.ticks.map((tick) => (
            <text key={tick} x={RIGHT + 8} y={right.y(tick) + 4}>
              {tick}
            </text>
          ))}
          {other?.ticks.map((tick) => (
            <text key={tick} x={left - 8} y={other.y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          ))}
          {xLabels.map((item, i) => (
            <text
              key={item.x}
              x={x(item.x)}
              y={HEIGHT - 1}
              textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            >
              {item.label}
            </text>
          ))}
        </g>
        {goal === undefined ? null : (
          <>
            <line
              className="tn-graph-goal"
              x1={left}
              y1={right.y(goal.y)}
              x2={RIGHT}
              y2={right.y(goal.y)}
            />
            <text
              className="tn-graph-goal-label"
              x={RIGHT}
              y={right.y(goal.y) - 6}
              textAnchor="end"
            >
              {goal.label}
            </text>
          </>
        )}
        {secondary === undefined || other === undefined ? null : (
          <polyline
            className="tn-graph-line tn-graph-line-secondary"
            points={path(secondary, other.y)}
          />
        )}
        <polyline className="tn-graph-line" points={path(points, right.y)} />
        {last === undefined ? null : (
          <circle className="tn-graph-point" cx={x(last.x)} cy={right.y(last.y)} r="4.5" />
        )}
      </svg>
    </figure>
  );
}
