import { useRef, useState } from 'react';
import { App as AntdApp } from 'antd';
import { Upload } from 'lucide-react';
import { PermissionButton } from './PermissionButton';
import { toApiError } from '@/utils/errors';

interface FileImportButtonProps {
  /** F 节点权限码,控制按钮可见性。 */
  permissionCode: string;
  /** 选择文件后的回调(通常是 service.importXxx(file))。 */
  onFile: (file: File) => Promise<{
    successCount: number;
    errorCount: number;
    errors: string[];
    warnings?: string[];
  }>;
  label?: string;
  accept?: string;
  loading?: boolean;
  onImported?: () => void;
}

/** 常驻 loading 提示的 key 前缀；拼上 permissionCode 后同页多个导入按钮不会互相销毁提示。 */
const LOADING_KEY_PREFIX = 'file-import-loading';

/**
 * 触发隐藏 file input 选择文件，导入完成后弹出成功 / 失败消息并可选刷新列表。
 * 封装“选文件 + 权限按钮 + 进行中状态 + 结果提示”样板，供各业务页面的 Excel 导入复用。
 *
 * 多行错误提示（典型为表头格式不匹配的 IMPORT_FORMAT_ERROR）用 Modal.error 展示，
 * message 会裁切长文本且一闪而过，弹窗才能让用户看清缺少哪些列、应该用什么模板。
 *
 * 导入是耗时请求（大 xlsx 解析可达数秒），期间必须有可见的进行中状态：
 * 按钮进入 loading（antd Button 在 loading 下自动吞掉点击，避免重复提交），
 * 同时挂一条常驻 `message.loading`，让用户知道“在跑，不是卡死了”。
 */
export function FileImportButton({
  permissionCode,
  onFile,
  label = '导入',
  accept = '.xlsx,.xls',
  loading,
  onImported,
}: FileImportButtonProps) {
  const { message, modal } = AntdApp.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const loadingKey = `${LOADING_KEY_PREFIX}-${permissionCode}`;

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 先清空 input，使同一文件可再次选择；file 已取到引用，不受影响。
    e.target.value = '';
    if (!file) {
      return;
    }
    setImporting(true);
    // duration=0 表示常驻，直到导入结束时按 key 主动销毁。
    message.loading({ key: loadingKey, content: `正在${label} ${file.name}…`, duration: 0 });
    try {
      const result = await onFile(file);
      message.success(`导入完成: 成功 ${result.successCount} 条, 失败 ${result.errorCount} 条`);
      if (result.errorCount > 0) {
        message.error(result.errors.slice(0, 3).join('；'));
      }
      // 警告行已导入成功但数据不完整，提醒人工核对。
      if (result.warnings && result.warnings.length > 0) {
        message.warning(`${result.warnings.length} 条记录需核对: ${result.warnings.slice(0, 2).join('；')}`);
      }
      onImported?.();
    } catch (error) {
      const apiError = toApiError(error);
      const lines = apiError.message.split('\n').filter(Boolean);
      if (lines.length > 1) {
        // 多行提示（典型为表头格式不匹配）用弹窗展示，保留换行与完整内容。
        modal.error({
          title: `${label}失败`,
          width: 720,
          content: (
            <div style={{ maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {lines.join('\n')}
            </div>
          ),
        });
      } else {
        message.error(apiError.message);
      }
    } finally {
      message.destroy(loadingKey);
      setImporting(false);
    }
  };

  return (
    <>
      <PermissionButton
        icon={<Upload size={15} />}
        permissionCode={permissionCode}
        loading={loading || importing}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </PermissionButton>
      <input ref={inputRef} type="file" accept={accept} hidden disabled={importing} onChange={handleChange} />
    </>
  );
}
