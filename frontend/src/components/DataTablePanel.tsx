import type { ReactNode } from 'react';
import { Grid, List, Table, type TableProps } from 'antd';
import { QueryErrorState } from './QueryErrorState';

interface DataTablePanelProps<T extends object> extends TableProps<T> {
  error?: unknown;
  onRetry?: () => void;
  renderMobileItem?: (record: T, index: number) => ReactNode;
}

const { useBreakpoint } = Grid;

export function DataTablePanel<T extends object>({ error, onRetry, renderMobileItem, ...tableProps }: DataTablePanelProps<T>) {
  const screens = useBreakpoint();
  const useMobileList = screens.sm === false && Boolean(renderMobileItem);
  const tableSize = tableProps.size ?? 'small';
  const mobilePagination =
    tableProps.pagination && typeof tableProps.pagination === 'object' ? { ...tableProps.pagination, position: 'bottom' as const } : tableProps.pagination;

  if (error) {
    return (
      <div className="table-panel">
        <QueryErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (useMobileList && renderMobileItem) {
    return (
      <div className="table-panel mobile-table-panel">
        <List<T>
          className="mobile-data-list"
          dataSource={Array.from(tableProps.dataSource ?? [])}
          loading={tableProps.loading}
          pagination={mobilePagination}
          renderItem={(record, index) => <List.Item>{renderMobileItem(record, index)}</List.Item>}
        />
      </div>
    );
  }

  return (
    <div className="table-panel">
      <Table<T> {...tableProps} size={tableSize} />
    </div>
  );
}
