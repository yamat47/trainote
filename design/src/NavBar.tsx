import type { ReactNode } from 'react';
import { classes } from './classes.ts';
import { Icon } from './Icon.tsx';

type NavBarProps = {
  title: string;
  trailing?: ReactNode;
  // A pushed screen: the bar collapses to the inline form, the title centred and the
  // way back at the left, named after the screen it returns to.
  back?: { label: string; onClick: () => void };
};

export function NavBar({ title, trailing, back }: NavBarProps) {
  return (
    <header className={classes('tn-navbar', back !== undefined && 'tn-navbar-inline')}>
      {back === undefined ? null : (
        <button type="button" className="tn-navbar-back" onClick={back.onClick}>
          <Icon name="chevron_left" />
          {back.label}
        </button>
      )}
      <h1 className="tn-navbar-title">{title}</h1>
      {trailing === undefined ? null : <div className="tn-navbar-trailing">{trailing}</div>}
    </header>
  );
}
