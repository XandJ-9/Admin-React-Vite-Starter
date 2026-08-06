import type {
  CurrentUser,
  FeishuAuthUrlResponse,
  FeishuLoginRequest,
  FeishuLoginResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  TokenResponse,
} from '@/types/auth';
import type { MenuNode } from '@/types/menu';
import { getJson, postJson } from './httpClient';

export const authApi = {
  login(payload: LoginRequest) {
    return postJson<LoginResponse>('/api/v1/auth/login', payload);
  },
  logout() {
    return postJson<void>('/api/v1/auth/logout');
  },
  me() {
    return getJson<CurrentUser>('/api/v1/auth/me');
  },
  menus() {
    return getJson<MenuNode[]>('/api/v1/auth/menus');
  },
  refreshToken(payload: RefreshTokenRequest) {
    return postJson<TokenResponse>('/api/v1/auth/refresh', payload);
  },
  getFeishuAuthUrl() {
    return getJson<FeishuAuthUrlResponse>('/api/v1/auth/feishu/auth-url');
  },
  feishuLogin(payload: FeishuLoginRequest) {
    return postJson<FeishuLoginResponse>('/api/v1/auth/feishu/login', payload);
  },
};
