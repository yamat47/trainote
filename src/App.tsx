import { useCallback, useEffect, useState } from 'react';
import { Screen } from '../design/src/Screen.tsx';
import { TabBar, type TabItem } from '../design/src/TabBar.tsx';
import { coachScreen } from './coach.ts';
import { Coach } from './tabs/Coach.tsx';
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
// and the notification's link (`/coach/weekly-review`) land on it; a tab has none, and
// so has a path no tab knows.
function tabOf(path: string): TabKey | undefined {
  if (path === ALL_WEIGHTS) return 'weight';
  return coachScreen(path) === undefined ? undefined : 'coach';
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

  const push = (next: string) => {
    history.pushState({ pushed: true }, '', next);
    setPath(next);
  };
  // The address of the screen changes under it: the weekly review's becomes its thread's.
  // Kept the same across renders, since the weekly review's effect depends on it.
  const replace = useCallback((next: string) => {
    history.replaceState(history.state, '', next);
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

  const coach = tab === 'coach' ? coachScreen(path) : undefined;

  return (
    <Screen
      tone={tab === 'profile' ? 'grouped' : 'plain'}
      // A thread has no tab bar: its composer holds the bottom, as in Messages.
      tabBar={
        coach === undefined ? <TabBar items={items} active={tab} onChange={select} /> : undefined
      }
    >
      {tab === 'notes' ? <Notes /> : null}
      {tab === 'weight' ? (
        <WeightTab
          allEntries={path === ALL_WEIGHTS}
          onShowAll={() => push(ALL_WEIGHTS)}
          onBack={leave}
        />
      ) : null}
      {tab === 'coach' ? (
        <Coach screen={coach} onPush={push} onReplace={replace} onBack={leave} />
      ) : null}
      {tab === 'profile' ? <Profile /> : null}
    </Screen>
  );
}
