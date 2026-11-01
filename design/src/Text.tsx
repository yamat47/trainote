import type { ReactNode } from 'react';

type TextProps = {
  // An iOS text style; the class comes from tokens.css.
  variant: 'footnote' | 'subheadline' | 'caption-1';
  // Secondary for a sentence that explains, error for the one red line under the thing
  // it concerns. An error is an <output>, which a screen reader announces.
  tone?: 'secondary' | 'error';
  children: ReactNode;
};

// A line of text at the page's margin: the sentence under the week strip, Claude's one
// sentence under a preview, the error line under a field or a row of buttons.
export function Text({ variant, tone = 'secondary', children }: TextProps) {
  const className = `tn-text tn-text-${variant} tn-text-${tone} ${variant}`;
  return tone === 'error' ? (
    <output className={className}>{children}</output>
  ) : (
    <p className={className}>{children}</p>
  );
}
