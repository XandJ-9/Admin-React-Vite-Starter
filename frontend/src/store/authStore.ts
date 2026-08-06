import { create } from 'zustand';
import { authService } from '@/services';
import type { CurrentUser, FeishuLoginRequest, LoginRequest } from '@/types/auth';
import type { MenuNode } from '@/types/menu';
import { toApiError } from '@/utils/errors';
import { clearSession, getRefreshToken, getToken, saveSession, updateTokens } from '@/utils/storage';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  menus: MenuNode[];
  accessReady: boolean;
  loading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  feishuLogin: (payload: FeishuLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  loadAccessControl: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

// Always read tokens from storage; never cache user so that permissions/roles
// are re-fetched from the backend on every page refresh.
const initialToken = getToken();
const initialRefreshToken = getRefreshToken();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  refreshToken: initialRefreshToken,
  user: null,
  menus: [],
  accessReady: false,
  loading: false,
  async login(payload) {
    set({ loading: true });
    let sessionSaved = false;
    try {
      const response = await authService.login(payload);
      saveSession(response.accessToken, response.refreshToken);
      sessionSaved = true;
      set({ token: response.accessToken, refreshToken: response.refreshToken ?? null, user: response.user });
      await loadAccessControlIntoStore(set);
    } catch (error) {
      if (sessionSaved) {
        applySignedOutState(set, true);
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  async feishuLogin(payload) {
    set({ loading: true });
    let sessionSaved = false;
    try {
      const response = await authService.feishuLogin(payload);
      saveSession(response.accessToken, response.refreshToken);
      sessionSaved = true;
      set({ token: response.accessToken, refreshToken: response.refreshToken ?? null, user: response.user });
      await loadAccessControlIntoStore(set);
    } catch (error) {
      if (sessionSaved) {
        applySignedOutState(set, true);
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  async logout() {
    try {
      await authService.logout();
    } finally {
      applySignedOutState(set, true);
    }
  },
  async restore() {
    const token = getToken();
    if (!token) {
      applySignedOutState(set);
      return;
    }
    try {
      const user = await authService.getCurrentUser();
      saveSession(token, getRefreshToken() ?? undefined);
      set({ token, refreshToken: getRefreshToken(), user });
      await loadAccessControlIntoStore(set);
    } catch (error) {
      if (toApiError(error).status === 403) {
        throw error;
      }
      applySignedOutState(set, true);
      throw error;
    }
  },
  async loadAccessControl() {
    await loadAccessControlIntoStore(set);
  },
  async refreshAccessToken() {
    const currentRefreshToken = get().refreshToken ?? getRefreshToken();
    if (!currentRefreshToken) {
      return false;
    }
    try {
      const response = await authService.refreshToken({ refreshToken: currentRefreshToken });
      if (!response.refreshToken) {
        throw new Error('No refresh token returned');
      }
      updateTokens(response.accessToken, response.refreshToken);
      set({ token: response.accessToken, refreshToken: response.refreshToken });
      return true;
    } catch {
      applySignedOutState(set, true);
      return false;
    }
  },
}));

async function loadAccessControlIntoStore(set: (state: Partial<AuthState>) => void): Promise<void> {
  const menus = await authService.getAuthorizedMenus();
  set({ menus, accessReady: true });
}

function applySignedOutState(set: (state: Partial<AuthState>) => void, clearPersistedSession = false): void {
  if (clearPersistedSession) {
    clearSession();
  }

  set({
    token: null,
    refreshToken: null,
    user: null,
    menus: [],
    accessReady: false,
  });
}

// Listen for state sync events from httpClient
if (typeof window !== 'undefined') {
  window.addEventListener('auth-state-sync', ((event: CustomEvent) => {
    const { token, refreshToken, clear } = event.detail;
    if (clear) {
      applySignedOutState(useAuthStore.setState, false);
    } else {
      useAuthStore.setState({ token, refreshToken });
    }
  }) as EventListener);
}
