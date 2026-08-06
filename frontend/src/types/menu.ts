import type { Id } from './common';

export type MenuType = 'C' | 'M' | 'F';

export interface MenuNode {
  id: Id;
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
  children: MenuNode[];
}

export interface MenuRouteNode extends MenuNode {
  type: 'M';
  path: string;
  componentPath: string;
}

export interface MenuCatalogNode extends MenuNode {
  type: 'C';
}

export interface MenuFunctionNode extends MenuNode {
  type: 'F';
  permissionCode: string;
}

export interface MenuBreadcrumbItem {
  key: string;
  title: string;
  path?: string;
}

export interface MenuSearchItem {
  key: string;
  title: string;
  path: string;
  labels: string[];
}

export interface MenuOpenKeyMeta {
  key: string;
  parentKey: string | null;
  ancestorKeys: string[];
}

export interface RouteRenderRecord {
  key: string;
  title: string;
  path: string;
  componentPath: string;
  menu: MenuRouteNode;
}

export interface ButtonPermissionRequest {
  path: string;
  permissionCode: string;
}
