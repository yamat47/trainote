export type Segment<Key extends string> = { key: Key; label: string };

type SegmentedProps<Key extends string> = {
  items: readonly Segment<Key>[];
  value: Key;
  onChange: (key: Key) => void;
  label: string;
};

// The segmented control that chooses the period of a graph: W, M, 6M, Y, as in Health.
// It never switches views; a second list lives behind a tint row.
export function Segmented<Key extends string>({
  items,
  value,
  onChange,
  label,
}: SegmentedProps<Key>) {
  return (
    <fieldset className="tn-segmented">
      <legend className="tn-sr-only">{label}</legend>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="tn-segment"
          aria-pressed={item.key === value}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </fieldset>
  );
}
