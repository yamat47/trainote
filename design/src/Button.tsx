import type { ReactNode } from 'react';

type ButtonProps = {
  variant?: 'plain' | 'prominent';
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function Button({ variant = 'plain', disabled, onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      className={`tn-btn tn-btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
