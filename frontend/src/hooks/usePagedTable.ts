import { useState } from 'react';
import type { TableProps } from 'antd';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import type { PageQuery, PageResult, SortQuery } from '@/types/common';

interface UsePagedTableOptions<TItem, TFilters extends object> {
  filters: TFilters;
  queryKey: (params: TFilters & Required<PageQuery>) => QueryKey;
  queryFn: (params: TFilters & Required<PageQuery> & SortQuery) => Promise<PageResult<TItem>>;
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
  const [sort, setSort] = useState<SortQuery>({});
  const params = { ...filters, ...sort, page, pageSize } as TFilters & Required<PageQuery>;
  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => queryFn(params),
  });

  // 服务端排序：antd Table 的 sorter 事件转为 sortBy/sortOrder 查询参数。
  // 排序变化时回到第 1 页；翻页不打断当前排序。
  const onTableChange: NonNullable<TableProps<TItem>['onChange']> = (_, __, sorter, extra) => {
    if (extra.action !== 'sort') return;
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    setSort({
      sortBy: activeSorter.order && typeof activeSorter.field === 'string' ? activeSorter.field : undefined,
      sortOrder: activeSorter.order ?? undefined,
    });
    setPage(1);
  };

  return {
    onTableChange,
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
