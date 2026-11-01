import { useCallback, useEffect, useState } from 'react';
import { Screen } from '../design/src/Screen.tsx';
import { TabBar, type TabItem } from '../design/src/TabBar.tsx';
import { NavBar } from '../design/src/NavBar.tsx';
import { Notes } from './tabs/Notes.tsx';
import { Profile } from './tabs/Profile.tsx';
import { ALL_WEIGHTS, WeightTab } from './tabs/Weight.tsx';

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

// The tab a screen pushed over one belongs to. A pushed screen has a path, so a reload
// and the notification's link (`/coach/weekly-review`, later) land on it; a tab has none,
// and so has a path no tab knows.
function tabOf(path: string): TabKey | undefined {
  return path === ALL_WEIGHTS ? 'weight' : undefined;
}

export function App() {
  const [stored, setStored] = useState<TabKey>(rememberedTab);
  const [path, setPath] = useState(() => location.pathname);

  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const pushed = tabOf(path);
  const tab: TabKey = pushed ?? stored;

  const push = useCallback((next: string) => {
    history.pushState({ pushed: true }, '', next);
    setPath(next);
  }, []);
  // Leaving a pushed screen pops what this app pushed; a screen opened by its address
  // has nothing to pop to, so the address is replaced and its tab is kept (a tab tap
  // replaces too, which leaves one spare `/` behind; docs/requirements.md).
  const leave = () => {
    const state: unknown = history.state;
    if (typeof state === 'object' && state !== null && 'pushed' in state) history.back();
    else {
      history.replaceState(null, '', '/');
      setPath('/');
      if (pushed !== undefined) {
        setStored(pushed);
        rememberTab(pushed);
      }
    }
  };
  const select = (key: TabKey) => {
    if (pushed !== undefined) {
      history.replaceState(null, '', '/');
      setPath('/');
    }
    setStored(key);
    rememberTab(key);
  };

  return (
    <Screen
      tone={tab === 'profile' ? 'grouped' : 'plain'}
      tabBar={<TabBar items={items} active={tab} onChange={select} />}
    >
      {tab === 'notes' ? <Notes /> : null}
      {tab === 'weight' ? (
        <WeightTab
          allEntries={path === ALL_WEIGHTS}
          onShowAll={() => push(ALL_WEIGHTS)}
          onBack={leave}
        />
      ) : null}
      {tab === 'coach' ? <NavBar title="Coach" /> : null}
      {tab === 'profile' ? <Profile /> : null}
    </Screen>
  );
}
