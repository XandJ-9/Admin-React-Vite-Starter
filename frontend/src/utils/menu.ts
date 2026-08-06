import type {
  MenuBreadcrumbItem,
  MenuNode,
  MenuOpenKeyMeta,
  MenuRouteNode,
  MenuSearchItem,
  RouteRenderRecord,
} from '@/types/menu';
import type { Id } from '@/types/common';
import { normalizeRoutePath } from './path';

export function getMenuKey(menu: MenuNode): string {
  const path = menu.type === 'M' ? normalizeRoutePath(menu.path) : null;
  return path ?? `menu-${menu.id}`;
}

export function isVisibleMenu(menu: MenuNode): boolean {
  return menu.enabled !== false && menu.visible !== false;
}

export function isRouteMenu(menu: MenuNode): menu is MenuRouteNode {
  return menu.type === 'M' && Boolean(normalizeRoutePath(menu.path)) && Boolean(menu.componentPath);
}

export function getRouteMenuItems(menus: MenuNode[]): MenuNode[] {
  return menus
    .filter((menu) => menu.type !== 'F' && isVisibleMenu(menu))
    .map((menu) => ({ ...menu, children: getRouteMenuItems(menu.children) }))
    .filter((menu) => menu.type === 'M' || menu.children.length > 0);
}

export function flattenRouteMenus(menus: MenuNode[]): MenuRouteNode[] {
  const routes: MenuRouteNode[] = [];

  const visit = (nodes: MenuNode[]) => {
    nodes.forEach((node) => {
      if (!isVisibleMenu(node)) {
        return;
      }

      if (isRouteMenu(node)) {
        routes.push({ ...node, path: normalizeRoutePath(node.path) ?? node.path, componentPath: node.componentPath });
      }

      visit(node.children);
    });
  };

  visit(menus);
  return routes;
}

export function getDefaultRoutePath(menus: MenuNode[]): string | null {
  return flattenRouteMenus(menus)[0]?.path ?? null;
}

export function getMenuByPath(menus: MenuNode[], pathname: string): MenuRouteNode | null {
  const normalizedPath = normalizeRoutePath(pathname);
  if (!normalizedPath) {
    return null;
  }

  return flattenRouteMenus(menus).find((menu) => normalizeRoutePath(menu.path) === normalizedPath) ?? null;
}

export function getRouteRecordByPath(menus: MenuNode[], pathname: string): RouteRenderRecord | null {
  const menu = getMenuByPath(menus, pathname);
  if (!menu) {
    return null;
  }

  return {
    key: getMenuKey(menu),
    title: menu.title,
    path: menu.path,
    componentPath: menu.componentPath,
    menu,
  };
}

export function getBreadcrumbItems(menus: MenuNode[], pathname: string): MenuBreadcrumbItem[] {
  const normalizedPath = normalizeRoutePath(pathname);
  if (!normalizedPath) {
    return [];
  }

  let matchedItems: MenuBreadcrumbItem[] = [];

  const visit = (nodes: MenuNode[], ancestors: MenuBreadcrumbItem[] = []) => {
    nodes.forEach((node) => {
      if (matchedItems.length > 0 || node.type === 'F' || !isVisibleMenu(node)) {
        return;
      }

      const key = getMenuKey(node);
      const path = node.type === 'M' ? normalizeRoutePath(node.path) ?? undefined : undefined;
      const currentItems = [...ancestors, { key, title: node.title, path }];

      if (node.type === 'M' && path === normalizedPath) {
        matchedItems = currentItems;
        return;
      }

      visit(node.children, currentItems);
    });
  };

  visit(menus);
  return matchedItems;
}

export function getMenuSearchItems(menus: MenuNode[]): MenuSearchItem[] {
  const items: MenuSearchItem[] = [];

  const visit = (nodes: MenuNode[], parentLabels: string[] = []) => {
    nodes.forEach((node) => {
      if (node.type === 'F' || !isVisibleMenu(node)) {
        return;
      }

      const labels = [...parentLabels, node.title];
      const path = node.type === 'M' ? normalizeRoutePath(node.path) : null;
      if (path) {
        items.push({ key: getMenuKey(node), title: node.title, path, labels });
      }

      visit(node.children, labels);
    });
  };

  visit(menus);
  return items;
}

export function getSelectedMenuKeys(menus: MenuNode[], pathname: string): string[] {
  const menu = getMenuByPath(menus, pathname);
  return menu ? [getMenuKey(menu)] : [];
}

export function getDefaultOpenMenuKeys(menus: MenuNode[], pathname: string): string[] {
  return getBreadcrumbItems(menus, pathname)
    .slice(0, -1)
    .map((item) => item.key);
}

export function getMenuOpenKeyMeta(menus: MenuNode[]): Record<string, MenuOpenKeyMeta> {
  const meta: Record<string, MenuOpenKeyMeta> = {};

  const visit = (nodes: MenuNode[], parentKey: string | null = null, ancestorKeys: string[] = []) => {
    nodes.forEach((node) => {
      if (node.type === 'F' || !isVisibleMenu(node)) {
        return;
      }

      const children = node.children.filter((child) => child.type !== 'F' && isVisibleMenu(child));
      if (children.length > 0) {
        const key = getMenuKey(node);
        meta[key] = { key, parentKey, ancestorKeys };
        visit(children, key, [...ancestorKeys, key]);
      }
    });
  };

  visit(menus);
  return meta;
}

export function getExclusiveOpenMenuKeys(
  currentOpenKeys: string[],
  nextOpenKeys: string[],
  keyMeta: Record<string, MenuOpenKeyMeta>,
): string[] {
  const latestOpenedKey = nextOpenKeys.find((key) => !currentOpenKeys.includes(key));
  if (latestOpenedKey && keyMeta[latestOpenedKey]) {
    return [...keyMeta[latestOpenedKey].ancestorKeys, latestOpenedKey];
  }

  return nextOpenKeys.filter((key) => Boolean(keyMeta[key]));
}

export function includeMenuAncestorIds(menus: MenuNode[], selectedIds: Id[]): Id[] {
  const selectedIdSet = new Set(selectedIds);
  const collectedIds = new Set<Id>();
  const result: Id[] = [];

  const addId = (id: Id) => {
    if (collectedIds.has(id)) {
      return;
    }

    collectedIds.add(id);
    result.push(id);
  };

  const visit = (nodes: MenuNode[], ancestorIds: Id[] = []) => {
    nodes.forEach((node) => {
      const currentPath = [...ancestorIds, node.id];

      if (selectedIdSet.has(node.id)) {
        currentPath.forEach(addId);
      }

      visit(node.children, currentPath);
    });
  };

  visit(menus);
  selectedIds.forEach(addId);

  return result;
}
