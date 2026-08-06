import type { Id } from './common';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  /** 单位：秒 */
  expiresIn?: number;
}

export interface LoginResponse extends TokenResponse {
  user: CurrentUser;
}

export interface CurrentUser {
  id: Id;
  username: string;
  nickname: string;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  roles: UserRoleSummary[];
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export interface UserRoleSummary {
  id: Id;
  code: string;
  name: string;
}

export interface FeishuAuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface FeishuLoginRequest {
  code: string;
  state: string;
}

export interface FeishuLoginResponse extends TokenResponse {
  user: CurrentUser;
  isNewUser: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
