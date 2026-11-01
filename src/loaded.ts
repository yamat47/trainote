import { useCallback, useEffect, useRef, useState } from 'react';

export type Shown<T> = { status: 'loading' } | { status: 'failed' } | ({ status: 'ready' } & T);

// What a tab shows of the server, loaded on mount and on demand. Responses are not
// ordered: a slow first load must not replace what a later load showed, and nothing is
// shown after the tab is left, so only the latest load writes. `replace` changes what is
// shown in place, for a save whose response already carries the new row.
export function useLoaded<T extends object>(load: () => Promise<T>) {
  const [shown, setShown] = useState<Shown<T>>({ status: 'loading' });
  const loadId = useRef(0);
  const reload = useCallback(() => {
    loadId.current += 1;
    const id = loadId.current;
    const run = async () => {
      let next: Shown<T>;
      try {
        next = { status: 'ready', ...(await load()) };
      } catch {
        next = { status: 'failed' };
      }
      if (id === loadId.current) setShown(next);
    };
    void run();
  }, [load]);

  useEffect(() => {
    reload();
    return () => {
      loadId.current += 1;
    };
  }, [reload]);

  const replace = useCallback(
    (update: (loaded: T) => T) =>
      setShown((prev) => (prev.status === 'ready' ? { ...prev, ...update(prev) } : prev)),
    [],
  );

  return { shown, reload, replace };
}
