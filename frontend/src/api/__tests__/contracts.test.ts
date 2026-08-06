import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../auth';
import { systemApi } from '../system';

vi.mock('../httpClient', () => ({
  apiBaseUrl: '/api',
  getJson: vi.fn(),
  postJson: vi.fn(),
  putJson: vi.fn(),
  deleteJson: vi.fn(),
}));

vi.mock('@/utils/storage', () => ({
  getToken: vi.fn(() => null),
}));

import { deleteJson, getJson, postJson, putJson } from '../httpClient';

const mockGet = vi.mocked(getJson);
const mockPost = vi.mocked(postJson);
const mockPut = vi.mocked(putJson);
const mockDelete = vi.mocked(deleteJson);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth API contracts', () => {
  it('login posts to /api/v1/auth/login', async () => {
    mockPost.mockResolvedValue({} as never);
    await authApi.login({ username: 'admin', password: 'pass' });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', { username: 'admin', password: 'pass' });
  });

  it('logout posts to /api/v1/auth/logout', async () => {
    mockPost.mockResolvedValue(undefined as never);
    await authApi.logout();
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/logout');
  });

  it('me gets /api/v1/auth/me', async () => {
    mockGet.mockResolvedValue({} as never);
    await authApi.me();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/me');
  });

  it('menus gets /api/v1/auth/menus', async () => {
    mockGet.mockResolvedValue([] as never);
    await authApi.menus();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/menus');
  });

  it('refreshToken posts to /api/v1/auth/refresh', async () => {
    mockPost.mockResolvedValue({} as never);
    await authApi.refreshToken({ refreshToken: 'rt' });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/refresh', { refreshToken: 'rt' });
  });

  it('getFeishuAuthUrl gets /api/v1/auth/feishu/auth-url', async () => {
    mockGet.mockResolvedValue({} as never);
    await authApi.getFeishuAuthUrl();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/feishu/auth-url');
  });

  it('feishuLogin posts to /api/v1/auth/feishu/login', async () => {
    mockPost.mockResolvedValue({} as never);
    await authApi.feishuLogin({ code: 'c', state: 's' });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/feishu/login', { code: 'c', state: 's' });
  });
});

describe('system API contracts', () => {
  it('getUsers gets /api/v1/system/users with params', async () => {
    mockGet.mockResolvedValue({} as never);
    await systemApi.getUsers({ page: 1, pageSize: 20 });
    expect(mockGet).toHaveBeenCalledWith('/api/v1/system/users', { page: 1, pageSize: 20 });
  });

  it('createUser posts to /api/v1/system/users', async () => {
    mockPost.mockResolvedValue({} as never);
    await systemApi.createUser({ username: 'u', nickname: 'n', password: 'p', status: 'enabled', roleIds: [1] });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/system/users', { username: 'u', nickname: 'n', password: 'p', status: 'enabled', roleIds: [1] });
  });

  it('updateUser puts to /api/v1/system/users/:id', async () => {
    mockPut.mockResolvedValue({} as never);
    await systemApi.updateUser(5, { nickname: 'n', status: 'enabled', roleIds: [1] });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/system/users/5', { nickname: 'n', status: 'enabled', roleIds: [1] });
  });

  it('deleteUser deletes /api/v1/system/users/:id', async () => {
    mockDelete.mockResolvedValue(undefined as never);
    await systemApi.deleteUser(5);
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/system/users/5');
  });

  it('getRoles gets /api/v1/system/roles', async () => {
    mockGet.mockResolvedValue({} as never);
    await systemApi.getRoles({ page: 1, pageSize: 20 });
    expect(mockGet).toHaveBeenCalledWith('/api/v1/system/roles', { page: 1, pageSize: 20 });
  });

  it('createRole posts to /api/v1/system/roles', async () => {
    mockPost.mockResolvedValue({} as never);
    await systemApi.createRole({ code: 'r', name: 'Role', status: 'enabled' });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/system/roles', { code: 'r', name: 'Role', status: 'enabled' });
  });

  it('updateRole puts to /api/v1/system/roles/:id', async () => {
    mockPut.mockResolvedValue({} as never);
    await systemApi.updateRole(3, { code: 'r', name: 'Role', status: 'enabled' });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/system/roles/3', { code: 'r', name: 'Role', status: 'enabled' });
  });

  it('deleteRole deletes /api/v1/system/roles/:id', async () => {
    mockDelete.mockResolvedValue(undefined as never);
    await systemApi.deleteRole(3);
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/system/roles/3');
  });

  it('assignRoleMenus posts to /api/v1/system/roles/menus', async () => {
    mockPost.mockResolvedValue({} as never);
    await systemApi.assignRoleMenus({ roleId: 2, menuIds: [1, 2] });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/system/roles/menus', { roleId: 2, menuIds: [1, 2] });
  });

  it('getMenus gets /api/v1/system/menus', async () => {
    mockGet.mockResolvedValue([] as never);
    await systemApi.getMenus();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/system/menus', {});
  });

  it('createMenu posts to /api/v1/system/menus', async () => {
    mockPost.mockResolvedValue({} as never);
    const payload = { menuCode: 'menu.test', parentId: 1, type: 'M' as const, title: 'T', path: '/t', order: 1, visible: true, enabled: true };
    await systemApi.createMenu(payload);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/system/menus', payload);
  });

  it('updateMenu puts to /api/v1/system/menus/:id', async () => {
    mockPut.mockResolvedValue({} as never);
    const payload = { menuCode: 'menu.test', parentId: 1, type: 'M' as const, title: 'T', path: '/t', order: 1, visible: true, enabled: true };
    await systemApi.updateMenu(10, payload);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/system/menus/10', payload);
  });

  it('deleteMenu deletes /api/v1/system/menus/:id', async () => {
    mockDelete.mockResolvedValue(undefined as never);
    await systemApi.deleteMenu(10);
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/system/menus/10');
  });
});
