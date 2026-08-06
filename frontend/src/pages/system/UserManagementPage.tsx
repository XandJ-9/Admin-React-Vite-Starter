import { App as AntdApp, Form, Input, Modal, Popconfirm, Select, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { Edit3, Plus, Trash2 } from 'lucide-react';
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
import type { RoleQueryParams, UserItem, UserQueryParams } from '@/types/system';
import { ENABLED_DISABLED_OPTIONS } from '@/constants/options';
import { systemCacheKeys } from './cacheKeys';

interface UserModalForm {
  username: string;
  nickname: string;
  password?: string;
  email?: string;
  status: 'enabled' | 'disabled';
  roleIds: Array<string | number>;
}

function UserManagementPage() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<UserQueryParams>();
  const [modalForm] = Form.useForm<UserModalForm>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UserItem | null>(null);
  const filters = Form.useWatch([], form) ?? {};
  const table = usePagedTable<UserItem, UserQueryParams>({
    filters,
    queryKey: systemCacheKeys.users,
    queryFn: systemService.getUsers,
  });
  const roleQueryParams = useMemo<RoleQueryParams>(() => ({ page: 1, pageSize: 100, status: 'enabled' }), []);
  const roleOptionsQuery = useQuery({
    queryKey: systemCacheKeys.roles(roleQueryParams),
    queryFn: () => systemService.getRoles(roleQueryParams),
    enabled: false,
  });
  const roleOptions = useMemo(
    () => roleOptionsQuery.data?.items.map((role) => ({ label: role.name, value: role.id })) ?? [],
    [roleOptionsQuery.data?.items],
  );
  const userButtons = useVisibleButtons(['system:user:update', 'system:user:delete']);
  const canUpdateUser = userButtons.canUse('system:user:update');
  const canDeleteUser = userButtons.canUse('system:user:delete');
  const canShowRowActions = userButtons.canUseAny;

  const loadRoleOptions = () => {
    if (!roleOptionsQuery.data && !roleOptionsQuery.isFetching) {
      void roleOptionsQuery.refetch();
    }
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.setFieldsValue({ status: 'enabled', roleIds: [] });
    loadRoleOptions();
    setModalOpen(true);
  };

  const openEditModal = (record: UserItem) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      username: record.username,
      nickname: record.nickname,
      email: record.email ?? undefined,
      status: record.status,
      roleIds: record.roleIds,
    });
    loadRoleOptions();
    setModalOpen(true);
  };

  const deleteMutation = useApiMutation<void, Id>({
    mutationFn: (id) => systemService.deleteUser(id),
    onSuccess: () => {
      message.success('用户已删除');
      void table.query.refetch();
    },
  });

  const saveMutation = useApiMutation<unknown, UserModalForm>({
    mutationFn: (values) => {
      if (editingRecord) {
        return systemService.updateUser(editingRecord.id, {
          nickname: values.nickname,
          email: values.email,
          status: values.status,
          roleIds: values.roleIds,
        });
      }
      return systemService.createUser({
        username: values.username,
        nickname: values.nickname,
        password: values.password ?? '123456',
        email: values.email,
        status: values.status,
        roleIds: values.roleIds,
      });
    },
    onSuccess: () => {
      message.success(editingRecord ? '用户已更新' : '用户已创建');
      setModalOpen(false);
      modalForm.resetFields();
      void table.query.refetch();
    },
  });

  const handleDelete = (record: UserItem) => {
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

  const columns: ColumnsType<UserItem> = [
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '昵称', dataIndex: 'nickname', width: 140 },
    { title: '邮箱', dataIndex: 'email', width: 200 },
    { title: '角色', dataIndex: 'roleNames', render: (value: string[] = []) => value.join('、') || '-' },
    { title: '状态', dataIndex: 'status', width: 100, render: (status) => <StatusTag status={status} /> },
    { title: '最后登录', dataIndex: 'lastLoginAt', width: 180, render: (value) => value ?? '-' },
    ...(canShowRowActions
      ? [
          {
            title: '操作',
            width: 112,
            fixed: 'right' as const,
            render: (_: unknown, record: UserItem) => (
              <RowActions>
                {canUpdateUser ? (
                  <Tooltip title="编辑">
                    <PermissionButton
                      aria-label={`编辑用户 ${record.nickname}`}
                      icon={<Edit3 size={14} />}
                      size="small"
                      permissionCode="system:user:update"
                      onClick={() => openEditModal(record)}
                    />
                  </Tooltip>
                ) : null}
                {canDeleteUser ? (
                  <Popconfirm title={`删除用户 ${record.nickname}?`} onConfirm={() => handleDelete(record)}>
                    <PermissionButton
                      aria-label={`删除用户 ${record.nickname}`}
                      title="删除"
                      icon={<Trash2 size={14} />}
                      size="small"
                      danger
                      permissionCode="system:user:delete"
                    />
                  </Popconfirm>
                ) : null}
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  const renderMobileUser = (record: UserItem) => (
    <article className="mobile-record-card">
      <div className="mobile-record-head">
        <div>
          <strong>{record.nickname}</strong>
          <span>{record.username}</span>
        </div>
        <StatusTag status={record.status} />
      </div>
      <dl className="mobile-record-meta">
        <div>
          <dt>邮箱</dt>
          <dd>{record.email ?? '-'}</dd>
        </div>
        <div>
          <dt>角色</dt>
          <dd>{record.roleNames?.join('、') || '-'}</dd>
        </div>
        <div>
          <dt>最后登录</dt>
          <dd>{record.lastLoginAt ?? '-'}</dd>
        </div>
      </dl>
      {canShowRowActions ? (
        <div className="mobile-record-actions">
          <RowActions>
            {canUpdateUser ? (
              <PermissionButton icon={<Edit3 size={14} />} size="small" permissionCode="system:user:update" onClick={() => openEditModal(record)}>
                编辑
              </PermissionButton>
            ) : null}
            {canDeleteUser ? (
              <Popconfirm title={`删除用户 ${record.nickname}?`} onConfirm={() => handleDelete(record)}>
                <PermissionButton icon={<Trash2 size={14} />} size="small" danger permissionCode="system:user:delete">
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
          <Input allowClear placeholder="用户名 / 昵称" />
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
        <PermissionButton type="primary" icon={<Plus size={15} />} permissionCode="system:user:create" onClick={openCreateModal}>
          新增用户
        </PermissionButton>
      </PageActionBar>
      <DataTablePanel<UserItem>
        rowKey="id"
        columns={columns}
        dataSource={table.tableData}
        loading={table.query.isFetching}
        pagination={table.pagination}
        scroll={{ x: 980 }}
        renderMobileItem={renderMobileUser}
        error={table.query.error}
        onRetry={() => table.query.refetch()}
      />
      <Modal
        title={editingRecord ? '编辑用户' : '新增用户'}
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
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input disabled={Boolean(editingRecord)} />
          </Form.Item>
          {!editingRecord ? (
            <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
              <Input.Password />
            </Form.Item>
          ) : null}
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入合法邮箱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="roleIds" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              mode="multiple"
              loading={roleOptionsQuery.isFetching}
              options={roleOptions}
              placeholder="请选择角色"
              onFocus={loadRoleOptions}
              onDropdownVisibleChange={(open) => {
                if (open) {
                  loadRoleOptions();
                }
              }}
            />
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

export default UserManagementPage;
