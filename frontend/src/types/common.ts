export type Id = string | number;

export interface ApiResponse<T = unknown> {
  code: string | number;
  message: string;
  data: T;
  success?: boolean;
  traceId?: string;
}

export interface MessageResponse {
  message: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'ascend' | 'descend';
}

export interface KeywordQuery {
  keyword?: string;
}

export type StatusFlag = 'enabled' | 'disabled';

export interface OptionItem<TValue extends Id = Id> {
  label: string;
  value: TValue;
  disabled?: boolean;
}

export interface BaseEntity {
  id: Id;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
