import type { Id, PageResult } from '@/types/common';
import type {
  MenuCreateRequest,
  MenuQueryParams,
  MenuUpdateRequest,
  RoleCreateRequest,
  RoleItem,
  RoleMenuAssignment,
  RoleQueryParams,
  RoleUpdateRequest,
  SystemMenuItem,
  UserCreateRequest,
  UserItem,
  UserQueryParams,
  UserUpdateRequest,
} from '@/types/system';
import { deleteJson, getJson, postJson, putJson } from './httpClient';

export const systemApi = {
  getUsers(params: UserQueryParams) {
    return getJson<PageResult<UserItem>>('/api/v1/system/users', params);
  },
  createUser(payload: UserCreateRequest) {
    return postJson<UserItem>('/api/v1/system/users', payload);
  },
  updateUser(id: Id, payload: UserUpdateRequest) {
    return putJson<UserItem>(`/api/v1/system/users/${id}`, payload);
  },
  deleteUser(id: Id) {
    return deleteJson(`/api/v1/system/users/${id}`);
  },
  getRoles(params: RoleQueryParams = {}) {
    return getJson<PageResult<RoleItem>>('/api/v1/system/roles', params);
  },
  createRole(payload: RoleCreateRequest) {
    return postJson<RoleItem>('/api/v1/system/roles', payload);
  },
  updateRole(id: Id, payload: RoleUpdateRequest) {
    return putJson<RoleItem>(`/api/v1/system/roles/${id}`, payload);
  },
  deleteRole(id: Id) {
    return deleteJson(`/api/v1/system/roles/${id}`);
  },
  assignRoleMenus(payload: RoleMenuAssignment) {
    return postJson<RoleMenuAssignment>('/api/v1/system/roles/menus', payload);
  },
  getMenus(params: MenuQueryParams = {}) {
    return getJson<SystemMenuItem[]>('/api/v1/system/menus', params);
  },
  createMenu(payload: MenuCreateRequest) {
    return postJson<SystemMenuItem>('/api/v1/system/menus', payload);
  },
  updateMenu(id: Id, payload: MenuUpdateRequest) {
    return putJson<SystemMenuItem>(`/api/v1/system/menus/${id}`, payload);
  },
  deleteMenu(id: Id) {
    return deleteJson(`/api/v1/system/menus/${id}`);
  },
};
