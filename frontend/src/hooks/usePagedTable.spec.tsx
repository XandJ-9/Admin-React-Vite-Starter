import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePagedTable } from './usePagedTable';

describe('usePagedTable', () => {
  it('refetches when reloading from the first page', async () => {
    const queryFn = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    const { result } = renderHook(
      () =>
        usePagedTable({
          filters: {},
          queryKey: (params) => ['items', params],
          queryFn,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.reloadFromFirstPage();
    });

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });

  it('requests server sorting, resets the page and preserves sorting across pagination', async () => {
    const queryFn = vi.fn().mockResolvedValue({ items: [], total: 100, page: 1, pageSize: 20 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => usePagedTable({
      filters: { keyword: '张' },
      queryKey: (params) => ['sorting-items', params],
      queryFn,
    }), { wrapper });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    act(() => result.current.pagination.onChange(3, 20));
    await waitFor(() => expect(queryFn).toHaveBeenLastCalledWith({ keyword: '张', page: 3, pageSize: 20 }));

    for (const order of ['ascend', 'descend', null] as const) {
      act(() => result.current.onTableChange({}, {}, { field: 'createdAt', order }, { action: 'sort', currentDataSource: [] }));
      await waitFor(() => expect(queryFn).toHaveBeenLastCalledWith({
        keyword: '张', page: 1, pageSize: 20,
        sortBy: order ? 'createdAt' : undefined, sortOrder: order ?? undefined,
      }));
      act(() => {
        result.current.pagination.onChange(2, 20);
        result.current.onTableChange({}, {}, {}, { action: 'paginate', currentDataSource: [] });
      });
      await waitFor(() => expect(queryFn).toHaveBeenLastCalledWith({
        keyword: '张', page: 2, pageSize: 20,
        sortBy: order ? 'createdAt' : undefined, sortOrder: order ?? undefined,
      }));
    }
  });
});
