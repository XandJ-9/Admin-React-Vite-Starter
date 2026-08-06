import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/types/auth';
import type { MenuNode } from '@/types/menu';
import { canUseButton } from './accessControl';

const user: CurrentUser = {
  id: 2,
  username: 'operator',
  nickname: '运营人员',
  roles: [],
};

const menus: MenuNode[] = [
  {
    id: 1,
    menuCode: 'menu.system',
    type: 'C',
    title: '系统管理',
    children: [
      {
        id: 2,
        menuCode: 'menu.system.users',
        type: 'M',
        title: '用户管理',
        path: '/system/users',
        componentPath: 'system/UserManagementPage',
        children: [
          {
            id: 3,
            menuCode: 'action.system.users.create',
            type: 'F',
            title: '新增用户',
            permissionCode: 'system:user:create',
            children: [],
          },
        ],
      },
    ],
  },
];

describe('canUseButton', () => {
  it('uses authorized F menu nodes when the current user permission list is unavailable', () => {
    expect(
      canUseButton(menus, { path: '/system/users', permissionCode: 'system:user:create' }, user),
    ).toBe(true);
  });

  it('does not expose buttons that are absent from both user permissions and authorized menus', () => {
    expect(
      canUseButton(menus, { path: '/system/users', permissionCode: 'system:user:delete' }, user),
    ).toBe(false);
  });
});
