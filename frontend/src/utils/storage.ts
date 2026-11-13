import { basePath } from './basePath';

// 存储键名前缀，由 VITE_STORAGE_PREFIX 配置。默认值是脚手架名，仅作向下兼容兜底：
// 同一域下部署多个由本脚手架派生的应用时，应给每个应用配不同的前缀。
// 兼容 undefined / 空串 / 纯空白，否则会拼出 '.token' 这种以点开头的怪键名。
const CONFIGURED_PREFIX = (import.meta.env.VITE_STORAGE_PREFIX ?? '').trim() || 'admin-react-vite-starter';

// localStorage 按 **origin** 隔离，不按路径隔离：同域下 /app-a/ 与 /app-b/ 共享同一份存储。
// 因此键名除了可配前缀，还再叠一层部署路径命名空间：即使两个应用忘了改
// VITE_STORAGE_PREFIX，只要子路径不同仍能自动隔离，不会互相覆盖 token / settings。
// basePath 为空(根路径部署)时用 'root' 占位，保证键名稳定不含空段。
// 容错：剥掉首尾斜杠再把中间斜杠换成 '-'，避免 '/a/b/' 产出 'a-b-' 这类尾差。
const APP_NAMESPACE = basePath.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'root';

// 前缀与路径命名空间相同时不重复拼接（否则会得到 'admin-hrms.admin-hrms.token'）。
const STORAGE_PREFIX = CONFIGURED_PREFIX === APP_NAMESPACE ? CONFIGURED_PREFIX : `${CONFIGURED_PREFIX}.${APP_NAMESPACE}`;
const TOKEN_KEY = `${STORAGE_PREFIX}.token`;
const REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}.refreshToken`;
const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}.settings`;

// 飞书 OAuth state nonce：发起授权前写入，回调时比对，防止登录 CSRF。
export const FEISHU_STATE_KEY = `${STORAGE_PREFIX}.feishuState`;

// 命名空间化之前的旧键（所有子路径应用共用同一份，正是冲突根源）。
// 前缀写死为当时的实际值，**不跟随** VITE_STORAGE_PREFIX：旧数据已经落在浏览器里，
// 是既定事实，改配置不会把已存的键名一起改掉。
// 仅作**读取兜底**，避免本次升级把已登录用户直接踢下线；一旦写入过新键就不再读它。
// 不主动清除，以免影响同域下尚未升级的兄弟应用。
const LEGACY_PREFIX = 'admin-react-vite-starter';
const LEGACY_TOKEN_KEY = `${LEGACY_PREFIX}.token`;
const LEGACY_REFRESH_TOKEN_KEY = `${LEGACY_PREFIX}.refreshToken`;
const LEGACY_SETTINGS_KEY = `${LEGACY_PREFIX}.settings`;
const LEGACY_THEME_STORAGE_KEY = `${LEGACY_PREFIX}.theme`;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
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
  // 退出登录必须连旧键一起清：否则 getToken() 的兜底读取会把旧 token 捞回来，
  // 表现为“退出后刷新又变成已登录”。
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function readJsonSetting<T>(): T | null {
  const raw =
    localStorage.getItem(SETTINGS_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_SETTINGS_KEY) ??
    localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    return null;
  }
}

export function writeJsonSetting(value: unknown): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
  localStorage.removeItem(LEGACY_SETTINGS_KEY);
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
}
