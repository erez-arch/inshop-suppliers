import React from 'react';
import './MobileShell.css';

interface MobileShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function MobileShell({ children, header, footer }: MobileShellProps) {
  return (
    <div className="mobile-shell">
      {header && <header className="mobile-shell__header">{header}</header>}
      <main className="mobile-shell__content">{children}</main>
      {footer && <footer className="mobile-shell__footer">{footer}</footer>}
    </div>
  );
}
