export interface ApiError {
  status?: number;
  code?: string | number;
  message: string;
  details?: unknown;
  traceId?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationError extends ApiError {
  fields: FieldError[];
}

export function isApiError(error: unknown): error is ApiError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as ApiError).message === 'string',
  );
}
