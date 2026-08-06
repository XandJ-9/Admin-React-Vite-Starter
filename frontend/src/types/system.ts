import type { Id, KeywordQuery, PageQuery, SortQuery, StatusFlag } from './common';
import type { MenuType } from './menu';

export interface UserItem {
  id: Id;
  username: string;
  nickname: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  status: StatusFlag;
  roleIds: Id[];
  roleNames?: string[];
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserQueryParams extends PageQuery, SortQuery, KeywordQuery {
  status?: StatusFlag;
  roleId?: Id;
}

export interface UserCreateRequest {
  username: string;
  nickname: string;
  password: string;
  email?: string | null;
  phone?: string | null;
  status: StatusFlag;
  roleIds: Id[];
}

export interface UserUpdateRequest {
  nickname: string;
  email?: string | null;
  phone?: string | null;
  status: StatusFlag;
  roleIds: Id[];
}

export interface RoleItem {
  id: Id;
  code: string;
  name: string;
  description?: string | null;
  status: StatusFlag;
  menuIds: Id[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleQueryParams extends PageQuery, SortQuery, KeywordQuery {
  status?: StatusFlag;
}

export interface RoleCreateRequest {
  code: string;
  name: string;
  description?: string | null;
  status: StatusFlag;
}

export type RoleUpdateRequest = RoleCreateRequest;

export interface RoleMenuAssignment {
  roleId: Id;
  menuIds: Id[];
}

export interface SystemMenuItem {
  id: Id;
  menuCode: string;
  parentId?: Id | null;
  type: MenuType;
  title: string;
  path?: string | null;
  componentPath?: string | null;
  icon?: string | null;
  permissionCode?: string | null;
  order: number;
  visible: boolean;
  enabled: boolean;
  tagViewEnabled: boolean;
  keepAliveEnabled: boolean;
  children: SystemMenuItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuQueryParams extends KeywordQuery {
  type?: MenuType;
  enabled?: boolean;
  visible?: boolean;
}

export interface MenuCreateRequest {
  menuCode: string;
  parentId?: Id | null;
  type: MenuType;
  title: string;
  path?: string | null;
  componentPath?: string | null;
  icon?: string | null;
  permissionCode?: string | null;
  order?: number;
  visible?: boolean;
  enabled?: boolean;
  tagViewEnabled?: boolean;
  keepAliveEnabled?: boolean;
}

export type MenuUpdateRequest = MenuCreateRequest;
