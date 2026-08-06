import { Button, Result } from 'antd';
import { toApiError } from '@/utils/errors';

interface QueryErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function QueryErrorState({ error, onRetry }: QueryErrorStateProps) {
  const apiError = toApiError(error);

  return (
    <Result
      status="error"
      title="数据加载失败"
      subTitle={apiError.message}
      extra={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            重试
          </Button>
        ) : null
      }
    />
  );
}
