import type { ReactNode } from 'react';

type ScreenProps = {
  // Plain for a full-width list, grouped for an inset grouped list (Profile): the page
  // and its navigation bar take the matching background.
  tone?: 'plain' | 'grouped';
  // The TabBar of a tab; nothing on a thread, whose Composer holds the bottom instead.
  tabBar?: ReactNode;
  children: ReactNode;
};

// The shell of every screen: the status bar's safe area above, the content, and the tab
// bar held at the bottom.
export function Screen({ tone = 'plain', tabBar, children }: ScreenProps) {
  return (
    <div className={tone === 'grouped' ? 'tn-screen tn-screen-grouped' : 'tn-screen'}>
      <main className="tn-screen-content">{children}</main>
      {tabBar === undefined ? null : <div className="tn-screen-tabbar">{tabBar}</div>}
    </div>
  );
}
