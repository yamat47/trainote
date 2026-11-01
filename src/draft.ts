import { useState } from 'react';

type Flags = { saving: boolean; failed: boolean };

// What a Save button reads of a draft: whether to show it, whether it can be pressed,
// and how the last save went.
export type Saving = Pick<
  ReturnType<typeof useDraft>,
  'offered' | 'ready' | 'saving' | 'failed' | 'submit'
>;

// Fields over a stored record: what the person typed over each stored value, a field
// they have not touched showing the stored value, so a load arriving late cannot
// overwrite their typing. Saving is offered only over loaded stored values, so a save
// before they arrived cannot drop a part of the record unseen.
export function useDraft<K extends string, R>(options: {
  // The stored values in the fields' words, or undefined while they have not loaded.
  stored: Partial<Record<K, string>> | undefined;
  // The request the fields make, or nothing while they do not hold a valid one.
  parse: (value: (key: K) => string) => R | undefined;
  save: (request: R) => Promise<void>;
}) {
  const [typed, setTyped] = useState<Partial<Record<K, string>>>({});
  const [flags, setFlags] = useState<Flags>({ saving: false, failed: false });
  const value = (key: K): string => typed[key] ?? options.stored?.[key] ?? '';
  const touched = Object.keys(typed).length > 0;
  const ready = options.parse(value);

  const edit = (field: K) => (next: string) => {
    setTyped((prev) => ({ ...prev, [field]: next }));
    setFlags((prev) => ({ ...prev, failed: false }));
  };

  const submit = async () => {
    if (ready === undefined) return;
    setFlags({ saving: true, failed: false });
    try {
      await options.save(ready);
      setTyped({});
      setFlags({ saving: false, failed: false });
    } catch {
      setFlags({ saving: false, failed: true });
    }
  };

  return {
    value,
    edit,
    // Save is shown once something was typed over loaded values, and pressable once the
    // fields hold a valid request.
    offered: options.stored !== undefined && touched,
    ready: ready !== undefined,
    saving: flags.saving,
    failed: flags.failed,
    submit,
  };
}
