import { Badge, Breadcrumb, Button, Dropdown, Empty, Layout, Popover, Select, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Bell, ChevronDown, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search, UserCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { GlobalSettings } from '@/components/GlobalSettings';
import type { CurrentUser } from '@/types/auth';
import type { MenuBreadcrumbItem, MenuSearchItem } from '@/types/menu';
import type { AppNavigationMode } from '@/types/settings';

const { Header } = Layout;

interface ShellHeaderProps {
  breadcrumbItems: MenuBreadcrumbItem[];
  collapsed: boolean;
  navigationMode: AppNavigationMode;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  onSearchSelect: (path: string) => void;
  onToggleSidebar: () => void;
  searchItems: MenuSearchItem[];
  topNav?: ReactNode;
  useDrawerNavigation: boolean;
  user: CurrentUser | null;
}

export function ShellHeader({
  breadcrumbItems,
  collapsed,
  navigationMode,
  onLogout,
  onOpenMobileMenu,
  onSearchSelect,
  onToggleSidebar,
  searchItems,
  topNav,
  useDrawerNavigation,
  user,
}: ShellHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const displayName = user?.nickname ?? user?.username ?? '用户';
  const showTopNavigation = navigationMode === 'top' && !useDrawerNavigation && Boolean(topNav);
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogOut size={15} />,
      label: '退出账号',
    },
  ];
  const searchOptions = searchItems.map((item) => ({
    value: item.path,
    label: item.labels.join(' / '),
  }));

  const handleSearchSelect = (path: string) => {
    onSearchSelect(path);
    setSearchOpen(false);
  };

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      onLogout();
    }
  };

  return (
    <Header className="app-header">
      <div className="app-header__brand">
              <Button className="app-header__menu" icon={<MenuIcon size={17} />} onClick={onOpenMobileMenu} aria-label="打开导航" />
              <Button
              type="text"
              size="small"
              className="app-header__sider-toggle"
              icon={collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              onClick={onToggleSidebar}
              aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            />
        {showTopNavigation ? (
          <div className="app-header__top-nav">{topNav}</div>
        ) : (
            <Breadcrumb
              className="app-header__breadcrumb"
              items={breadcrumbItems.length > 0 ? breadcrumbItems.map((item) => ({ title: item.title })) : [{ title: '工作台' }]}
            />
        )}
      </div>

      <div className="app-header__meta">
        <Popover
          trigger="click"
          placement="bottomRight"
          open={searchOpen}
          onOpenChange={setSearchOpen}
          content={
            <div className="quick-search-popover">
              <Typography.Text strong>快速跳转</Typography.Text>
              <Select<string>
                aria-label="全局搜索"
                autoFocus
                showSearch
                allowClear
                placeholder="搜索菜单"
                suffixIcon={<Search size={15} />}
                optionFilterProp="label"
                onSelect={handleSearchSelect}
                options={searchOptions}
              />
            </div>
          }
        >
          <Button aria-label="搜索菜单" icon={<Search size={15} />} size="small" />
        </Popover>
        <GlobalSettings />
        <Popover
          trigger="click"
          placement="bottomRight"
          content={
            <div className="alert-popover">
              <Typography.Text strong>通知与告警</Typography.Text>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无告警" />
            </div>
          }
        >
          <Button
            aria-label="通知与告警"
            icon={
              <Badge dot={false}>
                <Bell size={15} />
              </Badge>
            }
            size="small"
          />
        </Popover>
        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']}>
          <Button className="app-header__user-action" size="small" aria-label="用户菜单">
            <UserCircle size={15} />
            <span className="app-header__user-name">{displayName}</span>
            <ChevronDown size={14} />
          </Button>
        </Dropdown>
      </div>
    </Header>
  );
}
