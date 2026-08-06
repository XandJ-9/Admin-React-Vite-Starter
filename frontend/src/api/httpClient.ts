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
