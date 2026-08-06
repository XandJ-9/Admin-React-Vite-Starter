import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function PageShell({ children, fullWidth = false }: PageShellProps) {
  return (
    <section className={fullWidth ? 'page-shell page-shell--wide' : 'page-shell'}>
      {children}
    </section>
  );
}
