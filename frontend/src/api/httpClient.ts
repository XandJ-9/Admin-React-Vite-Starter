import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getMessageInstance } from '@/utils/message';
import { clearSession, getRefreshToken, getToken, updateTokens } from '@/utils/storage';
import { toApiErrorException } from '@/utils/errors';
import { basePath } from '@/utils/basePath';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || basePath;

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

// Sync auth store state with localStorage changes
// Use event-based sync to avoid circular dependency
function syncStoreState(token: string | null = null, refreshToken: string | null = null) {
  // Dispatch custom event that auth store can listen to
  const event = new CustomEvent('auth-state-sync', {
    detail: { token, refreshToken, clear: !token },
  });
  window.dispatchEvent(event);
}

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/api/v1/auth/refresh') {
        clearSession();
        syncStoreState();
        getMessageInstance()?.error('登录已过期，请重新登录');
        if (window.location.pathname !== `${basePath}/login`) {
          window.location.assign(`${basePath}/login`);
        }
        return Promise.reject(toApiErrorException(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return httpClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearSession();
        syncStoreState();
        isRefreshing = false;
        getMessageInstance()?.error('登录已过期，请重新登录');
        if (window.location.pathname !== `${basePath}/login`) {
          window.location.assign(`${basePath}/login`);
        }
        return Promise.reject(toApiErrorException(error));
      }

      try {
        const response = await httpClient.post<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
          refreshToken,
        });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        updateTokens(newAccessToken, newRefreshToken);
        syncStoreState(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        syncStoreState();
        getMessageInstance()?.error('登录已过期，请重新登录');
        if (window.location.pathname !== `${basePath}/login`) {
          window.location.assign(`${basePath}/login`);
        }
        return Promise.reject(toApiErrorException(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(toApiErrorException(error));
  },
);

export async function getJson<T>(url: string, params?: object): Promise<T> {
  const response = await httpClient.get<T>(url, { params });
  return response.data;
}

export async function postJson<T>(url: string, data?: unknown, config?: object): Promise<T> {
  const response = await httpClient.post<T>(url, data, config);
  return response.data;
}

export async function putJson<T>(url: string, data?: unknown): Promise<T> {
  const response = await httpClient.put<T>(url, data);
  return response.data;
}

export async function deleteJson(url: string): Promise<void> {
  await httpClient.delete(url);
}

/** 上传超时（毫秒）：Excel 等文件解析远超常规接口，全局 15s 会在服务端仍在处理时就报超时。 */
const UPLOAD_TIMEOUT = 5 * 60 * 1000;

/** 上传文件（multipart/form-data），返回解析后的 JSON 响应。 */
export async function uploadFile<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const response = await httpClient.post<T>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
  });
  return response.data;
}

/** 下载二进制流（xlsx 导出 / 模板下载）并触发浏览器保存。 */
export async function downloadBlob(url: string, filename: string, params?: object): Promise<void> {
  const response = await httpClient.get(url, { responseType: 'blob', params });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
