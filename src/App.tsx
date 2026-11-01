import { useState } from 'react';
import { NavBar } from '../design/src/NavBar.tsx';
import { TabBar, type TabItem } from '../design/src/TabBar.tsx';
import { Notes } from './tabs/Notes.tsx';
import { Profile } from './tabs/Profile.tsx';

const TAB_KEYS = ['notes', 'weight', 'coach', 'profile'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const tabs: Record<TabKey, Omit<TabItem<TabKey>, 'key'>> = {
  notes: { label: 'Notes', icon: 'doc_text', iconActive: 'doc_text_fill' },
  weight: { label: 'Weight', icon: 'chart_bar', iconActive: 'chart_bar_fill' },
  coach: {
    label: 'Coach',
    icon: 'bubble_left_bubble_right',
    iconActive: 'bubble_left_bubble_right_fill',
  },
  profile: {
    label: 'Profile',
    icon: 'person_crop_circle',
    iconActive: 'person_crop_circle_fill',
  },
};

const items: TabItem<TabKey>[] = TAB_KEYS.map((key) => ({ key, ...tabs[key] }));

const isTabKey = (value: string | null): value is TabKey => TAB_KEYS.some((key) => key === value);

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

  return (
    <div className={tab === 'profile' ? 'app app-grouped' : 'app'}>
      <main className="app-content">
        <NavBar title={tabs[tab].label} />
        {tab === 'notes' ? <Notes /> : null}
        {tab === 'profile' ? <Profile /> : null}
      </main>
      <div className="app-tabbar">
        <TabBar items={items} active={tab} onChange={select} />
      </div>
    </div>
  );
}
