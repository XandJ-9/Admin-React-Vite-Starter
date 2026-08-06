import { useState } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import type { PageQuery, PageResult } from '@/types/common';

interface UsePagedTableOptions<TItem, TFilters extends object> {
  filters: TFilters;
  queryKey: (params: TFilters & Required<PageQuery>) => QueryKey;
  queryFn: (params: TFilters & Required<PageQuery>) => Promise<PageResult<TItem>>;
  initialPageSize?: number;
}

export function usePagedTable<TItem, TFilters extends object>({
  filters,
  queryKey,
  queryFn,
  initialPageSize = 20,
}: UsePagedTableOptions<TItem, TFilters>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const params = { ...filters, page, pageSize } as TFilters & Required<PageQuery>;
  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => queryFn(params),
  });

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage: () => setPage(1),
    reloadFromFirstPage: () => {
      if (page === 1) {
        void query.refetch();
        return;
      }

      setPage(1);
    },
    query,
    tableData: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    pagination: {
      current: page,
      pageSize,
      total: query.data?.total ?? 0,
      showTotal: (total: number) => `共 ${total} 条`,
      responsive: true,
      showSizeChanger: true,
      onChange: (nextPage: number, nextPageSize: number) => {
        setPage(nextPage);
        setPageSize(nextPageSize);
      },
    },
  };
}
