import { App as AntdApp } from 'antd';
import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';
import { toApiError } from '@/utils/errors';

type ApiMutationOptions<TData, TVariables, TContext> = UseMutationOptions<TData, unknown, TVariables, TContext> & {
  suppressDefaultError?: boolean;
};

export function useApiMutation<TData = unknown, TVariables = void, TContext = unknown>(
  options: ApiMutationOptions<TData, TVariables, TContext>,
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const { message } = AntdApp.useApp();
  const { onError, suppressDefaultError = false, ...restOptions } = options;

  return useMutation({
    ...restOptions,
    onError: (error, variables, onMutateResult, context) => {
      onError?.(error, variables, onMutateResult, context);
      if (!suppressDefaultError) {
        message.error(toApiError(error).message);
      }
    },
  });
}
