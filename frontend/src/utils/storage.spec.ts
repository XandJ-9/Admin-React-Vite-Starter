import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
// basePath 在 storage.ts 模块级即被读取，必须在 import 之前 mock。
// 这里刻意用带首尾斜杠的原始值，验证命名空间推导对斜杠的容错。
vi.mock('./basePath', () => ({ basePath: '/starter-demo/' }));

const TOKEN_KEY = 'admin-react-vite-starter.starter-demo.token';
const REFRESH_KEY = 'admin-react-vite-starter.starter-demo.refreshToken';
const LEGACY_TOKEN_KEY = 'admin-react-vite-starter.token';
const LEGACY_REFRESH_KEY = 'admin-react-vite-starter.refreshToken';
const SETTINGS_KEY = 'admin-react-vite-starter.starter-demo.settings';
const LEGACY_SETTINGS_KEY = 'admin-react-vite-starter.settings';
const LEGACY_THEME_KEY = 'admin-react-vite-starter.theme';
const FEISHU_STATE_KEY = 'admin-react-vite-starter.starter-demo.feishuState';

// Re-import with the mock in place
const {
  getToken,
  getRefreshToken,
  saveSession,
  updateTokens,
  clearSession,
  readJsonSetting,
  writeJsonSetting,
  FEISHU_STATE_KEY: feishuStateKey,
} = await import('./storage');

describe('storage namespacing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('token', () => {
    it('reads from namespaced key when present', () => {
      localStorage.setItem(TOKEN_KEY, 'ns-token');
      expect(getToken()).toBe('ns-token');
    });

    it('falls back to legacy key when namespaced key is absent', () => {
      localStorage.setItem(LEGACY_TOKEN_KEY, 'legacy-token');
      expect(getToken()).toBe('legacy-token');
    });

    it('prefers namespaced key over legacy key', () => {
      localStorage.setItem(TOKEN_KEY, 'ns-token');
      localStorage.setItem(LEGACY_TOKEN_KEY, 'legacy-token');
      expect(getToken()).toBe('ns-token');
    });

    it('returns null when neither key exists', () => {
      expect(getToken()).toBeNull();
    });

    it('refreshToken follows the same namespaced/legacy fallback', () => {
      localStorage.setItem(LEGACY_REFRESH_KEY, 'legacy-refresh');
      expect(getRefreshToken()).toBe('legacy-refresh');
      localStorage.setItem(REFRESH_KEY, 'ns-refresh');
      expect(getRefreshToken()).toBe('ns-refresh');
    });

    it('saveSession only writes to namespaced keys', () => {
      saveSession('new-token', 'new-refresh');
      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('new-refresh');
      expect(localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
    });

    it('updateTokens only writes to namespaced keys', () => {
      updateTokens('access', 'refresh');
      expect(localStorage.getItem(TOKEN_KEY)).toBe('access');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh');
      expect(localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
    });

    it('clearSession removes both namespaced and legacy keys', () => {
      localStorage.setItem(TOKEN_KEY, 'ns');
      localStorage.setItem(REFRESH_KEY, 'ns');
      localStorage.setItem(LEGACY_TOKEN_KEY, 'legacy');
      localStorage.setItem(LEGACY_REFRESH_KEY, 'legacy');
      clearSession();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_REFRESH_KEY)).toBeNull();
    });
  });

  describe('settings', () => {
    it('reads from namespaced key when present', () => {
      const data = { colorMode: 'dark' as const };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      expect(readJsonSetting()).toEqual(data);
    });

    it('falls back to legacy settings key', () => {
      localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ colorMode: 'dark' }));
      expect(readJsonSetting()).toEqual({ colorMode: 'dark' });
    });

    it('falls back to legacy theme key', () => {
      localStorage.setItem(LEGACY_THEME_KEY, JSON.stringify({ colorMode: 'dark' }));
      expect(readJsonSetting()).toEqual({ colorMode: 'dark' });
    });

    it('prefers key order: ns > legacy settings > legacy theme', () => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ colorMode: 'light' }));
      localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ colorMode: 'dark' }));
      expect(readJsonSetting()).toEqual({ colorMode: 'light' });
    });

    it('writeJsonSetting only writes to namespaced key', () => {
      writeJsonSetting({ colorMode: 'dark' });
      expect(localStorage.getItem(SETTINGS_KEY)).toBe(JSON.stringify({ colorMode: 'dark' }));
      expect(localStorage.getItem(LEGACY_SETTINGS_KEY)).toBeNull();
    });
  });

  describe('feishu state', () => {
    it('feishu state key is namespaced too', () => {
      expect(feishuStateKey).toBe(FEISHU_STATE_KEY);
    });
  });

  describe('cross-app isolation', () => {
    it('apps with different basePaths do not interfere', () => {
      // 模拟 app-a 的 token
      localStorage.setItem('admin-react-vite-starter.app-a.token', 'token-a');
      // 模拟 app-b 的 token
      localStorage.setItem('admin-react-vite-starter.app-b.token', 'token-b');

      // 当前 app 是 starter-demo，不应读到其他 app 的 token
      expect(getToken()).toBeNull();
    });
  });
});

describe('VITE_STORAGE_PREFIX 可配置前缀', () => {
  // 前缀在模块加载时就被读取，改 env 必须配合 resetModules 重新 import 才能生效。
  async function loadWith(prefix: string | undefined) {
    vi.resetModules();
    if (prefix === undefined) {
      vi.stubEnv('VITE_STORAGE_PREFIX', '');
    } else {
      vi.stubEnv('VITE_STORAGE_PREFIX', prefix);
    }
    return import('./storage');
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('配置后的前缀会体现在键名上', async () => {
    const mod = await loadWith('my-app');
    mod.saveSession('t', 'r');
    expect(localStorage.getItem('my-app.starter-demo.token')).toBe('t');
    expect(localStorage.getItem('my-app.starter-demo.refreshToken')).toBe('r');
  });

  it('未配置 / 空串 / 纯空白都回退到默认前缀，不会拼出以点开头的键', async () => {
    for (const value of [undefined, '', '   ']) {
      localStorage.clear();
      const mod = await loadWith(value);
      mod.saveSession('t', 'r');
      expect(localStorage.getItem('admin-react-vite-starter.starter-demo.token')).toBe('t');
      expect(Object.keys(localStorage).every((k) => !k.startsWith('.'))).toBe(true);
    }
  });

  it('不同前缀的应用彼此隔离，即使部署在同一子路径', async () => {
    const appA = await loadWith('app-a');
    appA.saveSession('token-a', 'refresh-a');

    const appB = await loadWith('app-b');
    // B 读不到 A 的 token（旧键兜底也不应命中，A 写的是命名空间键）
    expect(appB.getToken()).toBeNull();

    appB.saveSession('token-b', 'refresh-b');
    // A 的会话不被 B 覆盖
    expect(localStorage.getItem('app-a.starter-demo.token')).toBe('token-a');
    expect(localStorage.getItem('app-b.starter-demo.token')).toBe('token-b');
  });

  it('前缀与路径命名空间相同时不重复拼接', async () => {
    // basePath 已 mock 为 /starter-demo/，前缀也配 starter-demo
    const mod = await loadWith('starter-demo');
    mod.saveSession('t', 'r');
    expect(localStorage.getItem('starter-demo.token')).toBe('t');
    expect(localStorage.getItem('starter-demo.starter-demo.token')).toBeNull();
  });

  it('旧键兜底不跟随自定义前缀（旧数据键名是既定事实）', async () => {
    localStorage.setItem('admin-react-vite-starter.token', 'legacy-token');
    const mod = await loadWith('my-app');
    // 仍能读到旧键，不会因为改了前缀就把已登录用户踢下线
    expect(mod.getToken()).toBe('legacy-token');
    // 退出时旧键也要清掉
    mod.clearSession();
    expect(localStorage.getItem('admin-react-vite-starter.token')).toBeNull();
  });
});
