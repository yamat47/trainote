import type { ReactNode } from 'react';

type NavBarProps = { title: string; trailing?: ReactNode };

export function NavBar({ title, trailing }: NavBarProps) {
  return (
    <header className="tn-navbar">
      <h1 className="tn-navbar-title">{title}</h1>
      {trailing === undefined ? null : <div className="tn-navbar-trailing">{trailing}</div>}
    </header>
  );
}
