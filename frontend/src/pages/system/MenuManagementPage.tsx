import { App as AntdApp, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { Edit3, FoldVertical, Plus, Trash2, UnfoldVertical } from 'lucide-react';
import { useEffect, useMemo, useState, type Key } from 'react';
import { DataTablePanel } from '@/components/DataTablePanel';
import { FilterToolbar } from '@/components/FilterToolbar';
import { IconSelect } from '@/components/IconSelect';
import { LucideIconView } from '@/components/LucideIconView';
import { PageActionBar } from '@/components/PageActionBar';
import { PageShell } from '@/components/PageShell';
import { PermissionButton } from '@/components/PermissionButton';
import { RowActions } from '@/components/RowActions';
import { StatusTag } from '@/components/StatusTag';
import { useApiMutation } from '@/hooks/useApiMutation';
import { usePagedTable } from '@/hooks/usePagedTable';
import { useVisibleButtons } from '@/hooks/useVisibleButtons';
import { systemService } from '@/services';
import type { Id } from '@/types/common';
import type { MenuType } from '@/types/menu';
import type { MenuQueryParams, SystemMenuItem } from '@/types/system';
import { systemCacheKeys } from './cacheKeys';

interface MenuModalForm {
  menuCode: string;
  parentId?: Id | typeof ROOT_PARENT_VALUE | null;
  type: MenuType;
  title: string;
  icon?: string;
  path?: string;
  componentPath?: string;
  permissionCode?: string;
  order?: number;
  visible: boolean;
  enabled: boolean;
  tagViewEnabled: boolean;
  keepAliveEnabled: boolean;
}

type MenuTableItem = Omit<SystemMenuItem, 'children'> & {
  children?: MenuTableItem[];
};

const ROOT_PARENT_VALUE = '__root__';

const menuTypeMeta: Record<MenuType, { label: string; color: string }> = {
  C: { label: '目录', color: 'processing' },
  M: { label: '菜单', color: 'success' },
  F: { label: '按钮', color: 'warning' },
};

const menuTypeOptions = Object.entries(menuTypeMeta).map(([value, meta]) => ({
  label: meta.label,
  value,
}));

function MenuTypeTag({ type }: { type: MenuType }) {
  const meta = menuTypeMeta[type];

  return (
    <span className="menu-type-cell">
      <Tag color={meta.color}>{meta.label}</Tag>
    </span>
  );
}

function filterSystemMenuTree(menus: SystemMenuItem[], keyword?: string, type?: SystemMenuItem['type']): MenuTableItem[] {
  const normalizedKeyword = keyword?.trim().toLowerCase();

  return menus.reduce<MenuTableItem[]>((items, menu) => {
    const children = filterSystemMenuTree(menu.children, keyword, type);
    const matchesKeyword =
      !normalizedKeyword ||
      [menu.title, menu.menuCode, menu.path, menu.componentPath, menu.permissionCode].some((value) => String(value ?? '').toLowerCase().includes(normalizedKeyword));
    const matchesType = !type || menu.type === type;

    if ((matchesKeyword && matchesType) || children.length > 0) {
      const menuWithoutChildren: MenuTableItem = {
        id: menu.id,
        menuCode: menu.menuCode,
        parentId: menu.parentId,
        type: menu.type,
        title: menu.title,
        path: menu.path,
        componentPath: menu.componentPath,
        icon: menu.icon,
        permissionCode: menu.permissionCode,
        order: menu.order,
        visible: menu.visible,
        enabled: menu.enabled,
        tagViewEnabled: menu.tagViewEnabled,
        keepAliveEnabled: menu.keepAliveEnabled,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
      };
      items.push(children.length > 0 ? { ...menuWithoutChildren, children } : menuWithoutChildren);
    }

    return items;
  }, []);
}

function countSystemMenuTree(menus: MenuTableItem[]): number {
  return menus.reduce((total, menu) => total + 1 + countSystemMenuTree(menu.children ?? []), 0);
}

function getExpandableSystemMenuKeys(menus: MenuTableItem[]): Id[] {
  return menus.reduce<Id[]>((keys, menu) => {
    if (menu.children && menu.children.length > 0) {
      keys.push(menu.id, ...getExpandableSystemMenuKeys(menu.children));
    }

    return keys;
  }, []);
}

function collectDescendantMenuIds(menu?: MenuTableItem | null): Set<Id> {
  const ids = new Set<Id>();
  const visit = (nodes: MenuTableItem[] = []) => {
    nodes.forEach((node) => {
      ids.add(node.id);
      visit(node.children ?? []);
    });
  };
  visit(menu?.children ?? []);
  return ids;
}

function findMenuById(menus: SystemMenuItem[], menuId: Id): SystemMenuItem | null {
  for (const menu of menus) {
    if (menu.id === menuId) {
      return menu;
    }
    const found = findMenuById(menu.children, menuId);
    if (found) {
      return found;
    }
  }
  return null;
}

function collectFullDescendantMenuIds(menus: SystemMenuItem[], menuId?: Id): Set<Id> {
  if (!menuId) {
    return new Set();
  }
  const menu = findMenuById(menus, menuId);
  return collectDescendantMenuIds(menu as MenuTableItem | null);
}

function parentTypeAllowed(type: MenuType | undefined, parent?: SystemMenuItem | null): boolean {
  if (!type) {
    return false;
  }
  if (!parent) {
    return type === 'C' || type === 'M';
  }
  if (type === 'F') {
    return parent.type === 'M';
  }
  return parent.type === 'C';
}

function buildParentOptions(menus: SystemMenuItem[], type?: MenuType, editingRecord?: MenuTableItem | null) {
  const disabledIds = collectFullDescendantMenuIds(menus, editingRecord?.id);
  if (editingRecord) {
    disabledIds.add(editingRecord.id);
  }

  const options: Array<{ label: string; value: Id | typeof ROOT_PARENT_VALUE; disabled?: boolean }> = [
    {
      label: '无父节点（根级）',
      value: ROOT_PARENT_VALUE,
      disabled: !parentTypeAllowed(type, null),
    },
  ];

  const visit = (nodes: SystemMenuItem[], depth = 0) => {
    nodes.forEach((menu) => {
      if (menu.type !== 'F') {
        const disabled = disabledIds.has(menu.id) || !parentTypeAllowed(type, menu);
        options.push({
          label: `${'　'.repeat(depth)}${menu.title}（${menuTypeMeta[menu.type].label}）`,
          value: menu.id,
          disabled,
        });
        visit(menu.children, depth + 1);
      }
    });
  };

  visit(menus);
  return options;
}

function MenuManagementPage() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<MenuQueryParams>();
  const [modalForm] = Form.useForm<MenuModalForm>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MenuTableItem | null>(null);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<Key[]>([]);
  const filters = Form.useWatch([], form) ?? {};
  const currentMenuType = Form.useWatch('type', modalForm);
  const tagViewEnabled = Form.useWatch('tagViewEnabled', modalForm);
  const fullMenuQuery = useQuery({
    queryKey: systemCacheKeys.menus({}),
    queryFn: () => systemService.getMenus({}),
  });
  const table = usePagedTable<MenuTableItem, MenuQueryParams>({
    filters,
    queryKey: systemCacheKeys.menus,
    queryFn: async (params) => {
      const menus = await systemService.getMenus(params);
      const items = filterSystemMenuTree(menus, params.keyword, params.type);
      return { items, total: countSystemMenuTree(items), page: 1, pageSize: countSystemMenuTree(items) };
    },
  });
  const defaultExpandedMenuKeys = useMemo(() => getExpandableSystemMenuKeys(table.tableData), [table.tableData]);
  const menuButtons = useVisibleButtons(['system:menu:update', 'system:menu:delete']);
  const canUpdateMenu = menuButtons.canUse('system:menu:update');
  const canDeleteMenu = menuButtons.canUse('system:menu:delete');
  const canShowRowActions = menuButtons.canUseAny;
  const parentOptions = useMemo(
    () => buildParentOptions(fullMenuQuery.data ?? [], currentMenuType, editingRecord),
    [currentMenuType, editingRecord, fullMenuQuery.data],
  );
  const menuTitleById = useMemo(() => {
    const titleMap = new Map<Id, string>();
    const visit = (nodes: SystemMenuItem[]) => {
      nodes.forEach((menu) => {
        titleMap.set(menu.id, menu.title);
        visit(menu.children);
      });
    };
    visit(fullMenuQuery.data ?? []);
    return titleMap;
  }, [fullMenuQuery.data]);

  useEffect(() => {
    setExpandedMenuKeys(defaultExpandedMenuKeys);
  }, [defaultExpandedMenuKeys]);

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.setFieldsValue({
      parentId: ROOT_PARENT_VALUE,
      type: 'M',
      visible: true,
      enabled: true,
      tagViewEnabled: true,
      keepAliveEnabled: false,
      order: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (record: MenuTableItem) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      parentId: record.parentId ?? ROOT_PARENT_VALUE,
      menuCode: record.menuCode,
      type: record.type,
      title: record.title,
      icon: record.icon ?? undefined,
      path: record.path ?? undefined,
      componentPath: record.componentPath ?? undefined,
      permissionCode: record.permissionCode ?? undefined,
      order: record.order,
      visible: record.visible,
      enabled: record.enabled,
      tagViewEnabled: record.tagViewEnabled,
      keepAliveEnabled: record.keepAliveEnabled,
    });
    setModalOpen(true);
  };

  const deleteMutation = useApiMutation<void, Id>({
    mutationFn: (id) => systemService.deleteMenu(id),
    onSuccess: () => {
      message.success('菜单已删除');
      void table.query.refetch();
      void fullMenuQuery.refetch();
    },
  });

  const saveMutation = useApiMutation<unknown, MenuModalForm>({
    mutationFn: (values) => {
      const payload = {
        ...values,
        parentId: values.parentId === ROOT_PARENT_VALUE ? null : values.parentId,
        tagViewEnabled: values.type === 'M' ? values.tagViewEnabled : false,
        keepAliveEnabled: values.type === 'M' ? values.keepAliveEnabled : false,
      };
      if (editingRecord) {
        return systemService.updateMenu(editingRecord.id, payload);
      }
      return systemService.createMenu(payload);
    },
    onSuccess: () => {
      message.success(editingRecord ? '菜单已更新' : '菜单已创建');
      setModalOpen(false);
      modalForm.resetFields();
      void table.query.refetch();
      void fullMenuQuery.refetch();
    },
  });

  const handleDelete = (record: MenuTableItem) => {
    deleteMutation.mutate(record.id);
  };

  const handleSubmitModal = async () => {
    try {
      const values = await modalForm.validateFields();
      saveMutation.mutate(values);
    } catch {
      // Form validation errors shown inline by Antd
    }
  };

  const columns: ColumnsType<MenuTableItem> = [
    { title: '名称', dataIndex: 'title', width: 180 },
    { title: '菜单编码', dataIndex: 'menuCode', width: 220 },
    { title: '父节点', dataIndex: 'parentId', width: 160, render: (value?: Id | null) => (value ? menuTitleById.get(value) ?? value : '根级') },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 72,
      render: (icon?: string | null) =>
        icon ? (
          <span className="menu-icon-cell">
            <LucideIconView name={icon} size={16} />
          </span>
        ) : (
          ''
        ),
    },
    { title: '类型', dataIndex: 'type', width: 150, render: (type: MenuType) => <MenuTypeTag type={type} /> },
    { title: '路由', dataIndex: 'path', width: 180, render: (value) => value ?? '-' },
    { title: '组件路径', dataIndex: 'componentPath', width: 220, render: (value) => value ?? '-' },
    { title: '权限码', dataIndex: 'permissionCode', width: 200, render: (value) => value ?? '-' },
    { title: '显示', dataIndex: 'visible', width: 90, render: (value) => <StatusTag status={Boolean(value)} /> },
    { title: '启用', dataIndex: 'enabled', width: 90, render: (value) => <StatusTag status={Boolean(value)} /> },
    { title: '标签页', dataIndex: 'tagViewEnabled', width: 90, render: (value) => <StatusTag status={Boolean(value)} /> },
    { title: '页面缓存', dataIndex: 'keepAliveEnabled', width: 100, render: (value) => <StatusTag status={Boolean(value)} /> },
    ...(canShowRowActions
      ? [
          {
            title: '操作',
            width: 112,
            fixed: 'right' as const,
            render: (_: unknown, record: MenuTableItem) => (
              <RowActions>
                {canUpdateMenu ? (
                  <Tooltip title="编辑">
                    <PermissionButton
                      aria-label={`编辑菜单 ${record.title}`}
                      icon={<Edit3 size={14} />}
                      size="small"
                      permissionCode="system:menu:update"
                      onClick={() => openEditModal(record)}
                    />
                  </Tooltip>
                ) : null}
                {canDeleteMenu ? (
                  <Popconfirm title={`删除菜单 ${record.title}?`} onConfirm={() => handleDelete(record)}>
                    <PermissionButton
                      aria-label={`删除菜单 ${record.title}`}
                      title="删除"
                      icon={<Trash2 size={14} />}
                      size="small"
                      danger
                      permissionCode="system:menu:delete"
                    />
                  </Popconfirm>
                ) : null}
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  const renderMobileMenu = (record: MenuTableItem) => (
    <article className="mobile-record-card">
      <div className="mobile-record-head">
        <div>
          <strong>{record.title}</strong>
          <span className="mobile-record-icon-line">
            {record.icon ? <LucideIconView name={record.icon} size={14} /> : null}
            {record.icon ?? menuTypeMeta[record.type].label}
          </span>
        </div>
        <StatusTag status={record.enabled} />
      </div>
      <dl className="mobile-record-meta">
        <div>
          <dt>类型</dt>
          <dd>
            <MenuTypeTag type={record.type} />
          </dd>
        </div>
        <div>
          <dt>路由</dt>
          <dd>{record.path ?? '-'}</dd>
        </div>
        <div>
          <dt>组件</dt>
          <dd>{record.componentPath ?? '-'}</dd>
        </div>
        <div>
          <dt>权限码</dt>
          <dd>{record.permissionCode ?? '-'}</dd>
        </div>
      </dl>
      {canShowRowActions ? (
        <div className="mobile-record-actions">
          <RowActions>
            {canUpdateMenu ? (
              <PermissionButton icon={<Edit3 size={14} />} size="small" permissionCode="system:menu:update" onClick={() => openEditModal(record)}>
                编辑
              </PermissionButton>
            ) : null}
            {canDeleteMenu ? (
              <Popconfirm title={`删除菜单 ${record.title}?`} onConfirm={() => handleDelete(record)}>
                <PermissionButton icon={<Trash2 size={14} />} size="small" danger permissionCode="system:menu:delete">
                  删除
                </PermissionButton>
              </Popconfirm>
            ) : null}
          </RowActions>
        </div>
      ) : null}
    </article>
  );

  return (
    <PageShell fullWidth>
      <FilterToolbar form={form} onSearch={() => table.reloadFromFirstPage()} onReset={() => table.reloadFromFirstPage()}>
        <Form.Item name="keyword">
          <Input allowClear placeholder="菜单名称 / 菜单编码 / 权限码" />
        </Form.Item>
        <Form.Item name="type">
          <Select
            allowClear
            placeholder="类型"
            style={{ width: 120 }}
            options={menuTypeOptions}
          />
        </Form.Item>
      </FilterToolbar>
      <PageActionBar>
        <PermissionButton type="primary" icon={<Plus size={15} />} permissionCode="system:menu:create" onClick={openCreateModal}>
          新增菜单
        </PermissionButton>
        <Button
          icon={<UnfoldVertical size={15} />}
          disabled={
            defaultExpandedMenuKeys.length === 0 ||
            defaultExpandedMenuKeys.every((key) => expandedMenuKeys.includes(key))
          }
          onClick={() => setExpandedMenuKeys(defaultExpandedMenuKeys)}
        >
          全部展开
        </Button>
        <Button
          icon={<FoldVertical size={15} />}
          disabled={expandedMenuKeys.length === 0}
          onClick={() => setExpandedMenuKeys([])}
        >
          全部折叠
        </Button>
      </PageActionBar>
      <DataTablePanel<MenuTableItem>
        className="menu-tree-table"
        rowKey="id"
        columns={columns}
        dataSource={table.tableData}
        loading={table.query.isFetching}
        pagination={false}
        scroll={{ x: 1450 }}
        expandable={{
          expandedRowKeys: expandedMenuKeys,
          onExpandedRowsChange: (keys) => setExpandedMenuKeys([...keys]),
          rowExpandable: (record) => Boolean(record.children?.length),
        }}
        renderMobileItem={renderMobileMenu}
        error={table.query.error}
        onRetry={() => table.query.refetch()}
      />
      <Modal
        title={editingRecord ? '编辑菜单' : '新增菜单'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          modalForm.resetFields();
        }}
        onOk={handleSubmitModal}
        confirmLoading={saveMutation.isPending}
        className="system-form-modal"
        width="min(560px, calc(100vw - 24px))"
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select options={menuTypeOptions} />
          </Form.Item>
          <Form.Item name="parentId" label="父节点" rules={[{ required: true, message: '请选择父节点' }]}>
            <Select
              showSearch
              loading={fullMenuQuery.isFetching}
              optionFilterProp="label"
              options={parentOptions}
              placeholder="请选择父节点"
            />
          </Form.Item>
          <Form.Item name="title" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="menuCode"
            label="菜单编码"
            rules={[
              { required: true, message: '请输入菜单编码' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_\-:.]*$/, message: '仅支持字母开头及字母、数字、下划线、短横线、冒号和点' },
            ]}
          >
            <Input placeholder="例如 menu.system.users" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <IconSelect />
          </Form.Item>
          <Form.Item name="path" label="路由">
            <Input placeholder="例如 /system/users" />
          </Form.Item>
          <Form.Item name="componentPath" label="组件路径">
            <Input placeholder="例如 system/UserManagementPage" />
          </Form.Item>
          <Form.Item name="permissionCode" label="权限码">
            <Input placeholder="例如 system:user:list" />
          </Form.Item>
          <Form.Item name="order" label="排序">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="visible" label="显示" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          {currentMenuType === 'M' ? (
            <>
              <Form.Item name="tagViewEnabled" label="启用标签页" valuePropName="checked">
                <Switch
                  onChange={(checked) => {
                    if (!checked) {
                      modalForm.setFieldValue('keepAliveEnabled', false);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="keepAliveEnabled"
                label="启用页面缓存"
                valuePropName="checked"
                extra="页面切换后保留组件状态；必须先启用标签页。"
              >
                <Switch disabled={!tagViewEnabled} />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>
    </PageShell>
  );
}

export default MenuManagementPage;
