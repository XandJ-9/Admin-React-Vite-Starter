import { App as AntdApp } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileImportButton } from './FileImportButton';
import { useAuthStore } from '@/store/authStore';
import { ApiErrorException } from '@/utils/errors';

type ImportResultLike = {
  successCount: number;
  errorCount: number;
  errors: string[];
  warnings?: string[];
};

/** 以超管身份渲染，绕过按钮权限，只聚焦导入结果的提示行为。 */
function renderButton(onFile: (file: File) => Promise<ImportResultLike>) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <FileImportButton permissionCode="demo:import" onFile={onFile} />
      </AntdApp>
    </MemoryRouter>,
  );
}

async function pickFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], 'wrong.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await userEvent.upload(input, file);
}

describe('FileImportButton', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 1, username: 'admin', nickname: '管理员', isSuperAdmin: true, roles: [], permissions: [] },
      menus: [],
    } as never);
  });

  it('表头格式错误时用弹窗展示多行提示（缺少的列 + 标准表头）', async () => {
    const message = [
      '【外出申请】导入失败：文件表头与要求的格式不一致。',
      '最接近的格式是“飞书审批导出·外出”，但缺少必需列：外出事由。',
      '“外出申请导入模板”标准表头：申请编号、申请人、部门、开始时间、结束时间',
    ].join('\n');
    const onFile = vi.fn().mockRejectedValue(
      new ApiErrorException({ message, code: 'IMPORT_FORMAT_ERROR', status: 400 }),
    );

    renderButton(onFile);
    await pickFile();

    await waitFor(() => {
      expect(document.querySelector('.ant-modal-confirm-title')).toHaveTextContent('导入失败');
    });
    expect(screen.getByText(/缺少必需列：外出事由/)).toBeInTheDocument();
    expect(screen.getByText(/标准表头/)).toBeInTheDocument();
  });

  it('单行错误信息走轻量提示，不弹窗', async () => {
    const onFile = vi.fn().mockRejectedValue(new ApiErrorException({ message: '文件读取失败', status: 400 }));

    renderButton(onFile);
    await pickFile();

    await waitFor(() => {
      expect(screen.getByText('文件读取失败')).toBeInTheDocument();
    });
    expect(document.querySelector('.ant-modal-confirm-title')).toBeNull();
  });

  it('导入进行中按钮进入 loading 并展示常驻提示，完成后恢复', async () => {
    let resolveImport: (value: ImportResultLike) => void = () => {};
    const onFile = vi.fn().mockImplementation(
      () =>
        new Promise<ImportResultLike>((resolve) => {
          resolveImport = resolve;
        }),
    );

    renderButton(onFile);
    await pickFile();

    // 请求未返回时：按钮 loading + 常驻提示，避免用户以为点了没反应而重复提交。
    await waitFor(() => {
      expect(document.querySelector('.ant-btn-loading')).not.toBeNull();
    });
    expect(screen.getByText(/正在导入 wrong\.xlsx/)).toBeInTheDocument();

    resolveImport({ successCount: 1, errorCount: 0, errors: [] });

    await waitFor(() => {
      expect(screen.getByText(/成功 1 条/)).toBeInTheDocument();
    });
    expect(document.querySelector('.ant-btn-loading')).toBeNull();
  });

  it('导入成功时提示成功与警告条数', async () => {
    const onFile = vi.fn().mockResolvedValue({
      successCount: 2,
      errorCount: 0,
      errors: [],
      warnings: ['第3行: 张三 2026-08-31 与第2行重复'],
    });

    renderButton(onFile);
    await pickFile();

    await waitFor(() => {
      expect(screen.getByText(/成功 2 条/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 条记录需核对/)).toBeInTheDocument();
  });
});
