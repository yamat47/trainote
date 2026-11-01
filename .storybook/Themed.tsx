import { useEffect, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

// The toolbar's theme goes on <html data-theme>, the attribute tokens.css reads; the app
// itself follows the OS instead.
export function Themed({ theme, children }: { theme: Theme; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);
  return children;
}
