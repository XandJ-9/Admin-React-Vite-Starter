import { systemApi } from '@/api/system';
import type {
  MenuCreateRequest,
  MenuQueryParams,
  MenuUpdateRequest,
  RoleCreateRequest,
  RoleMenuAssignment,
  RoleQueryParams,
  RoleUpdateRequest,
  UserCreateRequest,
  UserQueryParams,
  UserUpdateRequest,
} from '@/types/system';

export const systemService = {
  getUsers(params: UserQueryParams) {
    return systemApi.getUsers(params);
  },
  createUser(payload: UserCreateRequest) {
    return systemApi.createUser(payload);
  },
  updateUser(id: string | number, payload: UserUpdateRequest) {
    return systemApi.updateUser(id, payload);
  },
  getRoles(params: RoleQueryParams = {}) {
    return systemApi.getRoles(params);
  },
  createRole(payload: RoleCreateRequest) {
    return systemApi.createRole(payload);
  },
  updateRole(id: string | number, payload: RoleUpdateRequest) {
    return systemApi.updateRole(id, payload);
  },
  assignRoleMenus(payload: RoleMenuAssignment) {
    return systemApi.assignRoleMenus(payload);
  },
  getMenus(params: MenuQueryParams = {}) {
    return systemApi.getMenus(params);
  },
  createMenu(payload: MenuCreateRequest) {
    return systemApi.createMenu(payload);
  },
  updateMenu(id: string | number, payload: MenuUpdateRequest) {
    return systemApi.updateMenu(id, payload);
  },
  deleteUser(id: string | number) {
    return systemApi.deleteUser(id);
  },
  deleteRole(id: string | number) {
    return systemApi.deleteRole(id);
  },
  deleteMenu(id: string | number) {
    return systemApi.deleteMenu(id);
  },
};
