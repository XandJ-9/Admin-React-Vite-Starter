const STORAGE_PREFIX = 'admin-react-vite-starter';
const TOKEN_KEY = `${STORAGE_PREFIX}.token`;
const REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}.refreshToken`;
const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}.settings`;
const LEGACY_THEME_STORAGE_KEY = `${STORAGE_PREFIX}.theme`;

// 飞书 OAuth state nonce：发起授权前写入，回调时比对，防止登录 CSRF。
export const FEISHU_STATE_KEY = `${STORAGE_PREFIX}.feishuState`;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveSession(token: string, refreshToken: string | undefined): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function updateTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function readJsonSetting<T>(): T | null {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    return null;
  }
}

export function writeJsonSetting(value: unknown): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
}
