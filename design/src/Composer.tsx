import type { ChangeEvent } from 'react';
import { Icon } from './Icon.tsx';
import { Text } from './Text.tsx';

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  // Nothing goes out while the coach is answering; the text stays.
  disabled?: boolean;
  // The red line above the capsule when the last message could not be sent.
  error?: string | undefined;
  placeholder?: string;
  maxLength?: number;
};

// The reply field at the bottom of a Coach thread: a Messages-style capsule that grows
// with the text (the same mirrored ::after as Field's multiline form), and the send
// button beside it. It stays at the bottom of the screen as the thread scrolls, where the
// tab bar is on a tab.
export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  error,
  placeholder = 'Message',
  maxLength,
}: ComposerProps) {
  return (
    <div className="tn-composer">
      {error === undefined ? null : (
        <Text variant="caption-1" tone="error">
          {error}
        </Text>
      )}
      <div className="tn-composer-row">
        <span className="tn-composer-field" data-value={value}>
          <textarea
            className="tn-composer-input"
            rows={1}
            value={value}
            placeholder={placeholder}
            aria-label={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
          />
        </span>
        <button
          type="button"
          className="tn-composer-send"
          aria-label="Send"
          disabled={(disabled ?? false) || value.trim() === ''}
          onClick={onSend}
        >
          <Icon name="arrow_up_circle_fill" />
        </button>
      </div>
    </div>
  );
}
