import axios from 'axios';
import type { ApiError } from '@/types/error';

export class ApiErrorException extends Error implements ApiError {
  status?: number;
  code?: string | number;
  details?: unknown;
  traceId?: string;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiErrorException';
    this.status = apiError.status;
    this.code = apiError.code;
    this.details = apiError.details;
    this.traceId = apiError.traceId;
  }
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: unknown; detail?: unknown; code?: string | number; traceId?: string; error?: unknown } | undefined;
    return {
      status: error.response?.status,
      code: responseData?.code,
      message: formatApiMessage(responseData?.message ?? responseData?.detail ?? responseData?.error) ?? error.message ?? '请求失败',
      details: responseData,
      traceId: responseData?.traceId,
    };
  }

  if (isApiErrorLike(error)) {
    return error;
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: '未知错误' };
}

export function toApiErrorException(error: unknown): ApiErrorException {
  return error instanceof ApiErrorException ? error : new ApiErrorException(toApiError(error));
}

function isApiErrorLike(error: unknown): error is ApiError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as ApiError).message === 'string',
  );
}

function formatApiMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const messages = value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) return String(item.msg);
        return undefined;
      })
      .filter(Boolean);
    return messages.length ? messages.join('；') : undefined;
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
  return undefined;
}
