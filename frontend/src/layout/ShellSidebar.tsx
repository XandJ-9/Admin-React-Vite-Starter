import { Drawer, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { appBrandConfig } from '@/config/app';
import { useSettingsStore } from '@/store/settingsStore';

const { Sider } = Layout;

interface ShellSidebarProps {
  collapsed: boolean;
  menuItems: NonNullable<MenuProps['items']>;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onMenuClick: MenuProps['onClick'];
  onOpenChange: (openKeys: string[]) => void;
  openMenuKeys: string[];
  selectedMenuKeys: string[];
  transitioning: boolean;
  useDrawerNavigation: boolean;
}

export function ShellSidebar({
  collapsed,
  menuItems,
  mobileMenuOpen,
  onCloseMobileMenu,
  onMenuClick,
  onOpenChange,
  openMenuKeys,
  selectedMenuKeys,
  transitioning,
  useDrawerNavigation,
}: ShellSidebarProps) {
  const sidebarTheme = useSettingsStore((state) => state.settings.sidebarTheme);
  const inlineMenuOpenProps: Pick<MenuProps, 'onOpenChange' | 'openKeys'> =
    collapsed && !useDrawerNavigation
      ? {}
      : {
          onOpenChange,
          openKeys: openMenuKeys,
        };
  const menu = (
    <Menu
      theme={sidebarTheme}
      mode="inline"
      inlineCollapsed={collapsed && !useDrawerNavigation}
      items={menuItems}
      onClick={onMenuClick}
      selectedKeys={selectedMenuKeys}
      {...inlineMenuOpenProps}
    />
  );

  if (useDrawerNavigation) {
    return (
      <Drawer title={appBrandConfig.appName} width={280} placement="left" open={mobileMenuOpen} onClose={onCloseMobileMenu} rootClassName="app-nav-drawer" destroyOnHidden>
        <div className="app-nav-drawer__menu">
          <Menu
            theme={sidebarTheme}
            mode="inline"
            items={menuItems}
            onClick={onMenuClick}
            onOpenChange={onOpenChange}
            openKeys={openMenuKeys}
            selectedKeys={selectedMenuKeys}
          />
        </div>
      </Drawer>
    );
  }

  return (
    <Sider
      theme={sidebarTheme}
      className={[
        'app-sider',
        collapsed ? 'app-sider--collapsed' : '',
        transitioning ? 'app-sider--transitioning' : '',
      ].filter(Boolean).join(' ')}
      width={216}
      collapsedWidth={64}
      collapsed={collapsed}
    >
      <div className="app-logo">
        <span className="app-logo__mark">{appBrandConfig.logoText}</span>
        <span className="app-logo__text" aria-hidden={collapsed}>
          <span className="app-logo__name">{appBrandConfig.appName}</span>
          <span className="app-logo__sub">{appBrandConfig.appSubtitle}</span>
        </span>
      </div>
      <div className="app-sider__menu">{menu}</div>
    </Sider>
  );
}
