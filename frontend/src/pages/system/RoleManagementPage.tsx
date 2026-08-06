import { App as AntdApp, Button, Form, Input, Modal, Popconfirm, Select, Space, Spin, Tag, Tooltip, Tree } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'react';
import { ChevronDown, ChevronUp, Edit3, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTablePanel } from '@/components/DataTablePanel';
import { FilterToolbar } from '@/components/FilterToolbar';
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
import type { RoleItem, RoleQueryParams, SystemMenuItem } from '@/types/system';
import { ENABLED_DISABLED_OPTIONS } from '@/constants/options';
import { systemCacheKeys } from './cacheKeys';
import { collectExpandableMenuKeys, filterAuthorizationMenuTree } from './roleAuthorization';

interface RoleModalForm {
  code: string;
  name: string;
  description?: string;
  status: 'enabled' | 'disabled';
}

const menuTypeMeta: Record<SystemMenuItem['type'], { label: string; color: string }> = {
  C: { label: '目录', color: 'default' },
  M: { label: '页面', color: 'blue' },
  F: { label: '功能/数据', color: 'green' },
};

function getSelectedDescendantCount(menu: SystemMenuItem, selectedIds: Set<Id>): number {
  return menu.children.reduce((total, child) => {
    const current = selectedIds.has(child.id) ? 1 : 0;
    return total + current + getSelectedDescendantCount(child, selectedIds);
  }, 0);
}

function toMenuTreeData(menus: SystemMenuItem[], selectedIds: Set<Id>): DataNode[] {
  return menus.map((menu) => ({
    key: menu.id,
    title: <AuthorizationTreeTitle menu={menu} selectedDescendantCount={getSelectedDescendantCount(menu, selectedIds)} />,
    disabled: menu.enabled === false,
    children: toMenuTreeData(menu.children, selectedIds),
  }));
}

function AuthorizationTreeTitle({ menu, selectedDescendantCount }: { menu: SystemMenuItem; selectedDescendantCount: number }) {
  return (
    <span className="role-auth-tree-node">
      <span className="role-auth-tree-node__main">
        <Tag color={menuTypeMeta[menu.type].color}>{menuTypeMeta[menu.type].label}</Tag>
        <span className="role-auth-tree-node__title">{menu.title}</span>
        {menu.permissionCode ? <span className="role-auth-tree-node__code">{menu.permissionCode}</span> : null}
      </span>
      {selectedDescendantCount > 0 ? <Tag color="processing">子级已选 {selectedDescendantCount}</Tag> : null}
    </span>
  );
}

function toIds(keys: Key[]): Id[] {
  return keys.filter((key): key is string | number => typeof key === 'string' || typeof key === 'number');
}

function RoleManagementPage() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<RoleQueryParams>();
  const [modalForm] = Form.useForm<RoleModalForm>();
  const [modalOpen, setModalOpen] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RoleItem | null>(null);
  const [authorizingRecord, setAuthorizingRecord] = useState<RoleItem | null>(null);
  const [menuTree, setMenuTree] = useState<SystemMenuItem[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id[]>([]);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<Id[]>([]);
  const [authorizationKeyword, setAuthorizationKeyword] = useState('');
  const filters = Form.useWatch([], form) ?? {};
  const table = usePagedTable<RoleItem, RoleQueryParams>({
    filters,
    queryKey: systemCacheKeys.roles,
    queryFn: systemService.getRoles,
  });
  const roleButtons = useVisibleButtons(['system:role:menus', 'system:role:update', 'system:role:delete']);
  const canAuthorizeRole = roleButtons.canUse('system:role:menus');
  const canUpdateRole = roleButtons.canUse('system:role:update');
  const canDeleteRole = roleButtons.canUse('system:role:delete');
  const canShowRowActions = roleButtons.canUseAny;
  const selectedMenuIdSet = useMemo(() => new Set(selectedMenuIds), [selectedMenuIds]);
  const filteredMenuTree = useMemo(() => filterAuthorizationMenuTree(menuTree, authorizationKeyword), [authorizationKeyword, menuTree]);
  const authorizationTreeData = useMemo(() => toMenuTreeData(filteredMenuTree, selectedMenuIdSet), [filteredMenuTree, selectedMenuIdSet]);

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.setFieldsValue({ status: 'enabled' });
    setModalOpen(true);
  };

  const openEditModal = (record: RoleItem) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description ?? undefined,
      status: record.status,
    });
    setModalOpen(true);
  };

  const openAuthorizationModal = async (record: RoleItem) => {
    setAuthorizingRecord(record);
    setSelectedMenuIds(record.menuIds);
    setExpandedMenuKeys([]);
    setAuthorizationKeyword('');
    setAuthorizationOpen(true);
    setMenuLoading(true);
    try {
      const menus = await systemService.getMenus();
      setMenuTree(menus);
      setExpandedMenuKeys(collectExpandableMenuKeys(menus));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '菜单加载失败');
    } finally {
      setMenuLoading(false);
    }
  };

  const deleteMutation = useApiMutation<void, Id>({
    mutationFn: (id) => systemService.deleteRole(id),
    onSuccess: () => {
      message.success('角色已删除');
      void table.query.refetch();
    },
  });

  const saveMutation = useApiMutation<unknown, RoleModalForm>({
    mutationFn: (values) => {
      if (editingRecord) {
        return systemService.updateRole(editingRecord.id, values);
      }
      return systemService.createRole(values);
    },
    onSuccess: () => {
      message.success(editingRecord ? '角色已更新' : '角色已创建');
      setModalOpen(false);
      modalForm.resetFields();
      void table.query.refetch();
    },
  });

  const authorizeMutation = useApiMutation<unknown, { roleId: Id; menuIds: Id[] }>({
    mutationFn: (params) => systemService.assignRoleMenus(params),
    onSuccess: () => {
      message.success('角色菜单授权已保存');
      setAuthorizationOpen(false);
      setAuthorizingRecord(null);
      setSelectedMenuIds([]);
      setExpandedMenuKeys([]);
      setAuthorizationKeyword('');
      void table.query.refetch();
    },
  });

  const handleDelete = (record: RoleItem) => {
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

  const handleSubmitAuthorization = () => {
    if (!authorizingRecord) {
      return;
    }
    authorizeMutation.mutate({ roleId: authorizingRecord.id, menuIds: selectedMenuIds });
  };

  const columns: ColumnsType<RoleItem> = [
    { title: '角色编码', dataIndex: 'code', width: 160 },
    { title: '角色名称', dataIndex: 'name', width: 160 },
    { title: '描述', dataIndex: 'description', render: (value) => value ?? '-' },
    { title: '状态', dataIndex: 'status', width: 100, render: (status) => <StatusTag status={status} /> },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    ...(canShowRowActions
      ? [
          {
            title: '操作',
            width: 152,
            fixed: 'right' as const,
            render: (_: unknown, record: RoleItem) => (
              <RowActions>
                {canAuthorizeRole ? (
                  <Tooltip title="菜单授权">
                    <PermissionButton
                      aria-label={`配置角色 ${record.name} 的菜单授权`}
                      icon={<KeyRound size={14} />}
                      size="small"
                      permissionCode="system:role:menus"
                      onClick={() => openAuthorizationModal(record)}
                    />
                  </Tooltip>
                ) : null}
                {canUpdateRole ? (
                  <Tooltip title="编辑">
                    <PermissionButton
                      aria-label={`编辑角色 ${record.name}`}
                      icon={<Edit3 size={14} />}
                      size="small"
                      permissionCode="system:role:update"
                      onClick={() => openEditModal(record)}
                    />
                  </Tooltip>
                ) : null}
                {canDeleteRole ? (
                  <Popconfirm title={`删除角色 ${record.name}?`} onConfirm={() => handleDelete(record)}>
                    <PermissionButton
                      aria-label={`删除角色 ${record.name}`}
                      title="删除"
                      icon={<Trash2 size={14} />}
                      size="small"
                      danger
                      permissionCode="system:role:delete"
                    />
                  </Popconfirm>
                ) : null}
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  const renderMobileRole = (record: RoleItem) => (
    <article className="mobile-record-card">
      <div className="mobile-record-head">
        <div>
          <strong>{record.name}</strong>
          <span>{record.code}</span>
        </div>
        <StatusTag status={record.status} />
      </div>
      <dl className="mobile-record-meta">
        <div>
          <dt>描述</dt>
          <dd>{record.description ?? '-'}</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd>{record.createdAt ?? '-'}</dd>
        </div>
      </dl>
      {canShowRowActions ? (
        <div className="mobile-record-actions">
          <RowActions>
            {canAuthorizeRole ? (
              <PermissionButton icon={<KeyRound size={14} />} size="small" permissionCode="system:role:menus" onClick={() => openAuthorizationModal(record)}>
                授权
              </PermissionButton>
            ) : null}
            {canUpdateRole ? (
              <PermissionButton icon={<Edit3 size={14} />} size="small" permissionCode="system:role:update" onClick={() => openEditModal(record)}>
                编辑
              </PermissionButton>
            ) : null}
            {canDeleteRole ? (
              <Popconfirm title={`删除角色 ${record.name}?`} onConfirm={() => handleDelete(record)}>
                <PermissionButton icon={<Trash2 size={14} />} size="small" danger permissionCode="system:role:delete">
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
          <Input allowClear placeholder="角色编码 / 名称" />
        </Form.Item>
        <Form.Item name="status">
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 120 }}
            options={ENABLED_DISABLED_OPTIONS}
          />
        </Form.Item>
      </FilterToolbar>
      <PageActionBar>
        <PermissionButton type="primary" icon={<Plus size={15} />} permissionCode="system:role:create" onClick={openCreateModal}>
          新增角色
        </PermissionButton>
      </PageActionBar>
      <DataTablePanel<RoleItem>
        rowKey="id"
        columns={columns}
        dataSource={table.tableData}
        loading={table.query.isFetching}
        pagination={table.pagination}
        scroll={{ x: 900 }}
        renderMobileItem={renderMobileRole}
        error={table.query.error}
        onRetry={() => table.query.refetch()}
      />
      <Modal
        title={authorizingRecord ? `菜单授权 - ${authorizingRecord.name}` : '菜单授权'}
        open={authorizationOpen}
        onCancel={() => {
          setAuthorizationOpen(false);
          setAuthorizingRecord(null);
          setSelectedMenuIds([]);
          setExpandedMenuKeys([]);
          setAuthorizationKeyword('');
        }}
        onOk={handleSubmitAuthorization}
        confirmLoading={authorizeMutation.isPending}
        className="system-form-modal"
        width="min(760px, calc(100vw - 24px))"
      >
        <Spin spinning={menuLoading}>
          <div className="role-auth-toolbar">
            <Input.Search
              allowClear
              placeholder="搜索菜单名称 / 权限码"
              value={authorizationKeyword}
              onChange={(event) => {
                const keyword = event.target.value;
                setAuthorizationKeyword(keyword);
                if (keyword.trim()) {
                  setExpandedMenuKeys(collectExpandableMenuKeys(filterAuthorizationMenuTree(menuTree, keyword)));
                }
              }}
            />
            <Space.Compact>
              <Button icon={<ChevronDown size={14} />} onClick={() => setExpandedMenuKeys(collectExpandableMenuKeys(filteredMenuTree))}>
                展开
              </Button>
              <Button icon={<ChevronUp size={14} />} onClick={() => setExpandedMenuKeys([])}>
                收起
              </Button>
            </Space.Compact>
          </div>
          <div className="role-auth-summary">已选 {selectedMenuIds.length} 个授权点。页面、功能和数据权限独立保存，父级标签仅提示子级选中状态。</div>
          <Tree
            blockNode
            checkable
            checkStrictly
            checkedKeys={selectedMenuIds}
            expandedKeys={expandedMenuKeys}
            treeData={authorizationTreeData}
            onCheck={(checkedKeys) => {
              const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
              setSelectedMenuIds(toIds(keys));
            }}
            onExpand={(keys) => setExpandedMenuKeys(toIds(keys))}
          />
        </Spin>
      </Modal>
      <Modal
        title={editingRecord ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          modalForm.resetFields();
        }}
        onOk={handleSubmitModal}
        confirmLoading={saveMutation.isPending}
        className="system-form-modal"
        width="min(520px, calc(100vw - 24px))"
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item name="code" label="角色编码" rules={[{ required: true, message: '请输入角色编码' }]}>
            <Input disabled={Boolean(editingRecord)} />
          </Form.Item>
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={ENABLED_DISABLED_OPTIONS}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default RoleManagementPage;
