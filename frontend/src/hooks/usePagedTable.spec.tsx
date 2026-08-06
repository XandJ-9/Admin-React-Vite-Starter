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
});
