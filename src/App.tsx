import { useState } from 'react';
import { NavBar } from './components/NavBar.tsx';
import { TabBar, type TabItem } from './components/TabBar.tsx';
import { Profile } from './tabs/Profile.tsx';

const tabs = [
  { key: 'notes', label: 'Notes', icon: 'doc_text', iconActive: 'doc_text_fill' },
  { key: 'weight', label: 'Weight', icon: 'chart_bar', iconActive: 'chart_bar_fill' },
  {
    key: 'coach',
    label: 'Coach',
    icon: 'bubble_left_bubble_right',
    iconActive: 'bubble_left_bubble_right_fill',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person_crop_circle',
    iconActive: 'person_crop_circle_fill',
  },
] as const satisfies readonly TabItem<string>[];

type TabKey = (typeof tabs)[number]['key'];

const isTabKey = (value: string | null): value is TabKey => tabs.some((tab) => tab.key === value);

const TAB_STORAGE_KEY = 'tab';

// The last tab opened, remembered across launches. Storage can be unavailable (private
// browsing, a full quota); the app then always opens on Notes.
function rememberedTab(): TabKey {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return isTabKey(stored) ? stored : 'notes';
  } catch {
    return 'notes';
  }
}

function rememberTab(key: TabKey) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, key);
  } catch {
    // Nothing to do: the next launch opens on Notes.
  }
}

export function App() {
  const [tab, setTab] = useState<TabKey>(rememberedTab);
  const select = (key: TabKey) => {
    setTab(key);
    rememberTab(key);
  };
  const title = tabs.find((item) => item.key === tab)?.label ?? 'Notes';

  return (
    <div className={tab === 'profile' ? 'app app-grouped' : 'app'}>
      <main className="app-content">
        <NavBar title={title} />
        {tab === 'profile' ? <Profile /> : null}
      </main>
      <div className="app-tabbar">
        <TabBar items={tabs} active={tab} onChange={select} />
      </div>
    </div>
  );
}
