import { Menu } from 'antd';
import type { MenuProps } from 'antd';

interface ShellTopNavProps {
  menuItems: NonNullable<MenuProps['items']>;
  onMenuClick: MenuProps['onClick'];
  selectedMenuKeys: string[];
}

export function ShellTopNav({ menuItems, onMenuClick, selectedMenuKeys }: ShellTopNavProps) {
  return (
    <nav className="app-top-nav" aria-label="顶部导航">
      <Menu
        mode="horizontal"
        items={menuItems}
        onClick={onMenuClick}
        selectedKeys={selectedMenuKeys}
        overflowedIndicatorPopupClassName="app-top-nav-popup"
      />
    </nav>
  );
}
