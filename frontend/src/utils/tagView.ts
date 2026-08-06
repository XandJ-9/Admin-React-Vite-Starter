import type { RouteRenderRecord } from '@/types/menu';

export interface TagViewItem {
  key: string;
  title: string;
  path: string;
  closable: boolean;
}

/**
 * 构建标签视图项。
 *
 * 普通页面直接以路由路径作为标签 key；带 `mode` + `id` 查询参数的“工作页”（如新建 / 编辑 / 详情）
 * 按完整路径（含查询串）生成独立标签，避免同一页面不同实体的工作页互相覆盖。
 */
export function buildTagViewItem(route: RouteRenderRecord, search: string, closable = true): TagViewItem {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const id = params.get('id');

  if (mode && id) {
    return createWorkPageTag(route.path, route.title, { mode, id }, closable);
  }

  return {
    key: route.path,
    title: route.title,
    path: route.path,
    closable,
  };
}

export function getTagViewBasePath(tag: TagViewItem): string {
  return tag.path.split('?')[0];
}

function createWorkPageTag(
  basePath: string,
  title: string,
  query: Record<string, string>,
  closable: boolean,
): TagViewItem {
  const search = new URLSearchParams(query).toString();
  const path = `${basePath}?${search}`;
  return { key: path, title, path, closable };
}
