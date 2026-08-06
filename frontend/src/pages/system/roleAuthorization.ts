import type { Id } from '@/types/common';
import type { SystemMenuItem } from '@/types/system';

export function collectExpandableMenuKeys(menus: SystemMenuItem[]): Id[] {
  const keys: Id[] = [];

  const visit = (nodes: SystemMenuItem[]) => {
    nodes.forEach((menu) => {
      if (menu.children.length > 0) {
        keys.push(menu.id);
        visit(menu.children);
      }
    });
  };

  visit(menus);
  return keys;
}

function menuMatchesKeyword(menu: SystemMenuItem, keyword: string): boolean {
  return [menu.title, menu.menuCode, menu.path, menu.componentPath, menu.permissionCode].some((value) => String(value ?? '').toLowerCase().includes(keyword));
}

export function filterAuthorizationMenuTree(menus: SystemMenuItem[], keyword: string): SystemMenuItem[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return menus;
  }

  return menus.reduce<SystemMenuItem[]>((items, menu) => {
    const children = filterAuthorizationMenuTree(menu.children, normalizedKeyword);
    if (menuMatchesKeyword(menu, normalizedKeyword) || children.length > 0) {
      items.push({ ...menu, children });
    }
    return items;
  }, []);
}
