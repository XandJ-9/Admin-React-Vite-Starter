import { Tag } from 'antd';
import type { StatusFlag } from '@/types/common';

interface StatusTagProps {
  status: StatusFlag | boolean;
}

export function StatusTag({ status }: StatusTagProps) {
  const enabled = status === true || status === 'enabled';
  return <Tag color={enabled ? 'success' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>;
}
