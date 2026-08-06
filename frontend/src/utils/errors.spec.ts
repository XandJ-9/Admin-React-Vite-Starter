import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { toApiError, toApiErrorException } from './errors';

describe('toApiError', () => {
  it('reads unified backend error response fields', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
        data: {
          code: 'BAD_REQUEST',
          message: '数据源已禁用',
          detail: '数据源已禁用',
          traceId: 'trace-1',
        },
      },
    );

    expect(toApiError(error)).toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: '数据源已禁用',
      traceId: 'trace-1',
    });
  });

  it('wraps api errors as Error instances with displayable messages', () => {
    const exception = toApiErrorException({
      status: 403,
      code: 'FORBIDDEN',
      message: '无权限操作',
      traceId: 'trace-2',
    });

    expect(exception).toBeInstanceOf(Error);
    expect(exception.message).toBe('无权限操作');
    expect(toApiError(exception).status).toBe(403);
  });
});
