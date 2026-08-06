import { Grid, Layout } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LucideIconView } from '@/components/LucideIconView';
import { appBrandConfig } from '@/config/app';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTagViewStore } from '@/store/tagViewStore';
import type { MenuNode } from '@/types/menu';
import {
  flattenRouteMenus,
  getBreadcrumbItems,
  getDefaultOpenMenuKeys,
  getDefaultRoutePath,
  getExclusiveOpenMenuKeys,
  getMenuKey,
  getMenuOpenKeyMeta,
  getMenuSearchItems,
  getRouteRecordByPath,
  getRouteMenuItems,
  getSelectedMenuKeys,
} from '@/utils/menu';
import { buildTagViewItem } from '@/utils/tagView';
import { ShellHeader } from './ShellHeader';
import { ShellSidebar } from './ShellSidebar';
import { ShellTopNav } from './ShellTopNav';
import { TagView } from './TagView';

const { Content } = Layout;
const { useBreakpoint } = Grid;

function toMenuItems(nodes: MenuNode[]): NonNullable<MenuProps['items']> {
  return nodes.map((node) => {
    const children = toMenuItems(node.children);
    return {
      key: getMenuKey(node),
      icon: node.icon ? <LucideIconView name={node.icon} size={16} /> : undefined,
      label: node.title,
      children: children.length > 0 ? children : undefined,
      popupClassName: children.length > 0 ? 'shell-submenu-popup' : undefined,
    };
  });
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>([]);
  const [siderCollapsedOverride, setSiderCollapsedOverride] = useState<boolean | null>(null);
  const [siderTransitioning, setSiderTransitioning] = useState(false);
  const siderTransitionTimerRef = useRef<number | null>(null);
  const user = useAuthStore((state) => state.user);
  const menus = useAuthStore((state) => state.menus);
  const logout = useAuthStore((state) => state.logout);
  const navigationMode = useSettingsStore((state) => state.settings.navigationMode);
  const tags = useTagViewStore((state) => state.tags);
  const clearTags = useTagViewStore((state) => state.clearTags);
  const closeOthers = useTagViewStore((state) => state.closeOthers);
  const closeRight = useTagViewStore((state) => state.closeRight);
  const closeTag = useTagViewStore((state) => state.closeTag);
  const syncTags = useTagViewStore((state) => state.syncTags);
  const routeMenus = useMemo(() => getRouteMenuItems(menus), [menus]);
  const flatRouteMenus = useMemo(() => flattenRouteMenus(routeMenus), [routeMenus]);
  const defaultRoutePath = useMemo(() => getDefaultRoutePath(routeMenus), [routeMenus]);
  const homeTag = useMemo(() => {
    if (!defaultRoutePath) {
      return null;
    }
    const route = getRouteRecordByPath(routeMenus, defaultRoutePath);
    return route && route.menu.tagViewEnabled !== false ? buildTagViewItem(route, '', false) : null;
  }, [defaultRoutePath, routeMenus]);
  const allowedTags = useMemo(
    () =>
      flatRouteMenus.filter((menu) => menu.tagViewEnabled !== false).map((menu) =>
        buildTagViewItem(
          {
            key: getMenuKey(menu),
            title: menu.title,
            path: menu.path,
            componentPath: menu.componentPath,
            menu,
          },
          '',
        ),
      ),
    [flatRouteMenus],
  );
  const currentTag = useMemo(() => {
    const route = getRouteRecordByPath(routeMenus, location.pathname);
    return route && route.menu.tagViewEnabled !== false
      ? buildTagViewItem(route, location.search, route.path !== defaultRoutePath)
      : null;
  }, [defaultRoutePath, location.pathname, location.search, routeMenus]);
  const useDrawerNavigation = screens.md === false;
  const useTopNavigation = navigationMode === 'top' && !useDrawerNavigation;
  const defaultCollapsedSider = screens.md === true && screens.lg === false;
  const useCollapsedSider = screens.md === true && (siderCollapsedOverride ?? defaultCollapsedSider);

  /* ── 顶部导航模式：找出当前激活的顶级菜单，侧边栏展示其子菜单 ── */
  const activeTopMenuNode = useMemo(() => {
    if (!useTopNavigation) return null;
    const breadcrumb = getBreadcrumbItems(routeMenus, location.pathname);
    if (breadcrumb.length === 0) return null;
    const rootKey = breadcrumb[0].key;
    return routeMenus.find((node) => getMenuKey(node) === rootKey) ?? null;
  }, [useTopNavigation, routeMenus, location.pathname]);

  /** 侧边栏菜单树：顶部导航模式下只展示激活顶级菜单的子节点 */
  const sidebarMenuNodes = useMemo(() => {
    if (!activeTopMenuNode) return routeMenus;
    return activeTopMenuNode.children.length > 0 ? activeTopMenuNode.children : [];
  }, [activeTopMenuNode, routeMenus]);

  const sidebarMenuItems = useMemo(() => toMenuItems(sidebarMenuNodes), [sidebarMenuNodes]);

  /** 顶部导航菜单项：不展示子菜单（无 children），点击直接跳转第一个子页面 */
  const topNavMenuItems = useMemo(() => {
    if (!useTopNavigation) return [];
    return routeMenus.map((node) => ({
      key: getMenuKey(node),
      icon: node.icon ? <LucideIconView name={node.icon} size={16} /> : undefined,
      label: node.title,
    }));
  }, [useTopNavigation, routeMenus]);

  const activeTopMenuKey = activeTopMenuNode ? getMenuKey(activeTopMenuNode) : null;

  const menuOpenKeyMeta = useMemo(() => getMenuOpenKeyMeta(sidebarMenuNodes), [sidebarMenuNodes]);
  const selectedMenuKeys = useMemo(() => getSelectedMenuKeys(sidebarMenuNodes, location.pathname), [location.pathname, sidebarMenuNodes]);
  const breadcrumbItems = useMemo(() => getBreadcrumbItems(routeMenus, location.pathname), [location.pathname, routeMenus]);
  const searchItems = useMemo(() => getMenuSearchItems(routeMenus), [routeMenus]);

  useEffect(() => {
    setMenuOpenKeys(getDefaultOpenMenuKeys(sidebarMenuNodes, location.pathname));
  }, [location.pathname, sidebarMenuNodes]);

  useEffect(() => {
    syncTags({
      allowedTags,
      currentTag,
      homeTag,
    });
  }, [allowedTags, currentTag, homeTag, syncTags]);

  useEffect(() => {
    const appName = appBrandConfig.appName;
    if (breadcrumbItems.length > 0) {
      document.title = `${breadcrumbItems[breadcrumbItems.length - 1].title} - ${appName}`;
    } else {
      document.title = appName;
    }
    return () => {
      document.title = appName;
    };
  }, [breadcrumbItems]);

  useEffect(() => {
    return () => {
      if (siderTransitionTimerRef.current) {
        window.clearTimeout(siderTransitionTimerRef.current);
      }
    };
  }, []);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const path = String(key);
    setMobileMenuOpen(false);
    if (path.startsWith('/') && path !== location.pathname) {
      navigate(path);
    }
  };

  /** 顶部导航点击：M 节点直接跳转；C 节点跳转到其第一个子页面 */
  const handleTopNavClick: MenuProps['onClick'] = ({ key }) => {
    // M 节点的 key 为路由路径（以 / 开头）
    if (key.startsWith('/') && key !== location.pathname) {
      navigate(key);
      return;
    }
    // C 节点的 key 为 menu-{id}，找到对应节点后跳转第一个子页面
    const node = routeMenus.find((n) => getMenuKey(n) === key);
    const firstChild = node && flattenRouteMenus(node.children)[0];
    if (firstChild && firstChild.path !== location.pathname) {
      navigate(firstChild.path);
    }
  };

  const handleMenuOpenChange = (nextOpenKeys: string[]) => {
    setMenuOpenKeys((currentOpenKeys) => getExclusiveOpenMenuKeys(currentOpenKeys, nextOpenKeys, menuOpenKeyMeta));
  };

  const handleLogout = async () => {
    clearTags();
    await logout();
    navigate('/login', { replace: true });
  };

  const handleCloseTag = (key: string) => {
    const tagIndex = tags.findIndex((tag) => tag.key === key);
    if (tagIndex < 0) {
      return;
    }
    const isActiveTag = currentTag?.key === key;
    const nextTag = isActiveTag ? tags[tagIndex - 1] ?? tags[tagIndex + 1] : null;
    closeTag(key);
    if (nextTag) {
      navigate(nextTag.path);
    }
  };

  const handleToggleSidebar = () => {
    if (siderTransitionTimerRef.current) {
      window.clearTimeout(siderTransitionTimerRef.current);
    }
    setSiderTransitioning(true);
    siderTransitionTimerRef.current = window.setTimeout(() => setSiderTransitioning(false), 260);
    setSiderCollapsedOverride(!useCollapsedSider);
  };

  return (
    <Layout className="app-shell">
      <ShellSidebar
        collapsed={useCollapsedSider}
        menuItems={sidebarMenuItems}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        onMenuClick={handleMenuClick}
        onOpenChange={handleMenuOpenChange}
        openMenuKeys={menuOpenKeys}
        selectedMenuKeys={selectedMenuKeys}
        transitioning={siderTransitioning}
        useDrawerNavigation={useDrawerNavigation}
      />
      <Layout className="app-main">
        <ShellHeader
          breadcrumbItems={breadcrumbItems}
          collapsed={useCollapsedSider}
          navigationMode={navigationMode}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSearchSelect={(path) => {
            if (path !== location.pathname) {
              navigate(path);
            }
          }}
          onToggleSidebar={handleToggleSidebar}
          searchItems={searchItems}
          topNav={<ShellTopNav menuItems={topNavMenuItems} onMenuClick={handleTopNavClick} selectedMenuKeys={activeTopMenuKey ? [activeTopMenuKey] : []} />}
          useDrawerNavigation={useDrawerNavigation}
          user={user}
        />
        {tags.length > 0 ? (
          <TagView
            activeKey={currentTag?.key ?? null}
            onClose={handleCloseTag}
            onCloseCurrent={() => {
              if (currentTag?.closable) {
                handleCloseTag(currentTag.key);
              }
            }}
            onCloseOthers={() => {
              if (currentTag) {
                closeOthers(currentTag.key);
              }
            }}
            onCloseRight={() => {
              if (currentTag) {
                closeRight(currentTag.key);
              }
            }}
            onSelect={(path) => {
              if (`${location.pathname}${location.search}` !== path) {
                navigate(path);
              }
            }}
            tags={tags}
          />
        ) : null}
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
