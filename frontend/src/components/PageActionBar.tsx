import type { ReactNode } from 'react';

interface PageActionBarProps {
  children: ReactNode;
}

export function PageActionBar({ children }: PageActionBarProps) {
  return <div className="page-action-bar">{children}</div>;
}
