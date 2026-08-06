import { describe, expect, it } from 'vitest';
import type { RouteRenderRecord } from '@/types/menu';
import { buildTagViewItem } from './tagView';

const userRoute = {
  key: '/system/users',
  title: '用户管理',
  path: '/system/users',
  componentPath: 'system/UserManagementPage',
  menu: {
    id: 1,
    menuCode: 'menu.system.user',
    type: 'M',
    title: '用户管理',
    path: '/system/users',
    componentPath: 'system/UserManagementPage',
    children: [],
  },
} satisfies RouteRenderRecord;

describe('buildTagViewItem', () => {
  it('keeps ordinary filter parameters out of the menu tag', () => {
    expect(buildTagViewItem(userRoute, '?status=enabled')).toMatchObject({
      key: '/system/users',
      path: '/system/users',
      title: '用户管理',
    });
  });

  it('creates an independent tag for mode+id work pages', () => {
    expect(buildTagViewItem(userRoute, '?mode=edit&id=12')).toEqual({
      key: '/system/users?mode=edit&id=12',
      path: '/system/users?mode=edit&id=12',
      title: '用户管理',
      closable: true,
    });
  });

  it('ignores mode without id and treats the page as ordinary', () => {
    expect(buildTagViewItem(userRoute, '?mode=create')).toMatchObject({
      key: '/system/users',
      path: '/system/users',
      title: '用户管理',
    });
  });

  it('marks the home tag as non-closable when requested', () => {
    expect(buildTagViewItem(userRoute, '', false)).toMatchObject({
      key: '/system/users',
      path: '/system/users',
      closable: false,
    });
  });
});
