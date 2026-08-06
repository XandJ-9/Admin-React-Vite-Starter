import { describe, expect, it } from 'vitest';
import type { MenuNode } from '@/types/menu';
import { includeMenuAncestorIds } from './menu';

const menus: MenuNode[] = [
  {
    id: 1,
    menuCode: 'catalog.system',
    type: 'C',
    title: '系统管理',
    children: [
      {
        id: 10,
        menuCode: 'menu.system.roles',
        parentId: 1,
        type: 'M',
        title: '角色管理',
        path: '/system/roles',
        componentPath: 'system/RoleManagementPage',
        children: [
          {
            id: 101,
            menuCode: 'action.system.roles.system.role.create',
            parentId: 10,
            type: 'F',
            title: '新增角色',
            permissionCode: 'system:role:create',
            children: [],
          },
          {
            id: 102,
            menuCode: 'action.system.roles.system.role.menus',
            parentId: 10,
            type: 'F',
            title: '菜单授权',
            permissionCode: 'system:role:menus',
            children: [],
          },
        ],
      },
      {
        id: 20,
        menuCode: 'menu.system.menus',
        parentId: 1,
        type: 'M',
        title: '菜单管理',
        path: '/system/menus',
        componentPath: 'system/MenuManagementPage',
        children: [],
      },
    ],
  },
];

describe('includeMenuAncestorIds', () => {
  it('returns an empty list when no menu is selected', () => {
    expect(includeMenuAncestorIds(menus, [])).toEqual([]);
  });

  it('keeps a selected root menu without adding extra ids', () => {
    expect(includeMenuAncestorIds(menus, [1])).toEqual([1]);
  });

  it('includes every ancestor on the selected menu path', () => {
    expect(includeMenuAncestorIds(menus, [102])).toEqual([1, 10, 102]);
  });

  it('deduplicates shared ancestors for multiple selected nodes', () => {
    expect(includeMenuAncestorIds(menus, [101, 102, 20])).toEqual([1, 10, 101, 102, 20]);
  });

  it('deduplicates repeated selected ids', () => {
    expect(includeMenuAncestorIds(menus, [102, 102])).toEqual([1, 10, 102]);
  });

  it('preserves selected ids that are not found in the current tree', () => {
    expect(includeMenuAncestorIds(menus, [999])).toEqual([999]);
  });
});
