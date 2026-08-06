import type { CurrentUser } from '@/types/auth';
import type { MenuNode } from '@/types/menu';
import { normalizeRoutePath } from './path';

export function getButtonPermissions(menus: MenuNode[], pathname: string): string[] {
  const normalizedPath = normalizeRoutePath(pathname);
  if (!normalizedPath) {
    return [];
  }

  let permissions: string[] = [];

  const visit = (nodes: MenuNode[]) => {
    nodes.forEach((node) => {
      if (node.type === 'M' && normalizeRoutePath(node.path) === normalizedPath) {
        permissions = node.children
          .filter((child) => child.type === 'F' && child.permissionCode && child.enabled !== false)
          .map((child) => child.permissionCode as string);
        return;
      }

      visit(node.children);
    });
  };

  visit(menus);
  return permissions;
}

export function canUseButton(
  menus: MenuNode[],
  request: { path: string; permissionCode: string },
  user: CurrentUser | null,
): boolean {
  if (!user) {
    return false;
  }

  if (user.isSuperAdmin) {
    return true;
  }

  if (user.permissions?.includes(request.permissionCode)) {
    return true;
  }

  return getButtonPermissions(menus, request.path).includes(request.permissionCode);
}

export function canUseAnyButton(
  menus: MenuNode[],
  requests: Array<{ path: string; permissionCode: string }>,
  user: CurrentUser | null,
): boolean {
  return requests.some((request) => canUseButton(menus, request, user));
}
