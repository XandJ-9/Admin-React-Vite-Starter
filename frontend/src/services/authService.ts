import { authApi } from '@/api/auth';
import type { FeishuLoginRequest, LoginRequest, RefreshTokenRequest } from '@/types/auth';
import type { MenuNode } from '@/types/menu';
import { normalizeRoutePath } from '@/utils/path';
import { normalizeText } from '@/utils/text';

function normalizeMenuNode(node: MenuNode): MenuNode {
  return {
    ...node,
    menuCode: normalizeText(node.menuCode) ?? `menu.${node.id}`,
    type: node.type,
    title: normalizeText(node.title) ?? '未命名菜单',
    path: normalizeRoutePath(node.path),
    componentPath: normalizeText(node.componentPath),
    icon: normalizeText(node.icon),
    permissionCode: normalizeText(node.permissionCode),
    order: Number.isFinite(node.order) ? node.order : 0,
    visible: node.visible !== false,
    enabled: node.enabled !== false,
    tagViewEnabled: node.type === 'M' && node.tagViewEnabled !== false,
    keepAliveEnabled: node.type === 'M' && node.tagViewEnabled !== false && node.keepAliveEnabled === true,
    children: Array.isArray(node.children)
      ? node.children.map(normalizeMenuNode).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [],
  };
}

export const authService = {
  login(payload: LoginRequest) {
    return authApi.login(payload);
  },
  logout() {
    return authApi.logout();
  },
  getCurrentUser() {
    return authApi.me();
  },
  async getAuthorizedMenus(): Promise<MenuNode[]> {
    const menus = await authApi.menus();
    return menus.map(normalizeMenuNode).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
  refreshToken(payload: RefreshTokenRequest) {
    return authApi.refreshToken(payload);
  },
  getFeishuAuthUrl() {
    return authApi.getFeishuAuthUrl();
  },
  feishuLogin(payload: FeishuLoginRequest) {
    return authApi.feishuLogin(payload);
  },
};
