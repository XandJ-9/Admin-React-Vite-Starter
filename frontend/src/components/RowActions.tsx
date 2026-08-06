import type { ReactNode } from 'react';
import { Space } from 'antd';

interface RowActionsProps {
  children: ReactNode;
}

export function RowActions({ children }: RowActionsProps) {
  return (
    <Space className="row-actions" size={6} wrap={false}>
      {children}
    </Space>
  );
}
