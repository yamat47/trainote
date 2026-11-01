import { Icon } from './Icon.tsx';

export type TabItem<Key extends string> = {
  key: Key;
  label: string;
  icon: string;
  iconActive: string;
};

type TabBarProps<Key extends string> = {
  items: readonly TabItem<Key>[];
  active: Key;
  onChange: (key: Key) => void;
  label?: string;
};

export function TabBar<Key extends string>({
  items,
  active,
  onChange,
  label = 'Sections',
}: TabBarProps<Key>) {
  return (
    <div className="tn-tabbar" role="tablist" aria-label={label}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            className="tn-tab"
            aria-selected={selected}
            onClick={() => onChange(item.key)}
          >
            <Icon name={selected ? item.iconActive : item.icon} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
