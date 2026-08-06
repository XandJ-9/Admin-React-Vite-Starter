import type { ReactNode } from 'react';
import { Button, Form, Grid, Space, type FormInstance } from 'antd';
import { RefreshCw, Search } from 'lucide-react';

interface FilterToolbarProps<T extends object> {
  form: FormInstance<T>;
  onSearch: (values: T) => void;
  onReset: () => void;
  children: ReactNode;
}

const { useBreakpoint } = Grid;

export function FilterToolbar<T extends object>({ form, onSearch, onReset, children }: FilterToolbarProps<T>) {
  const screens = useBreakpoint();
  const stacked = screens.sm === false;

  return (
    <div className="toolbar-panel">
      <Form className="filter-form" form={form} layout={stacked ? 'vertical' : 'inline'} onFinish={onSearch}>
        {children}
        <Space className="filter-actions" wrap>
          <Button type="primary" htmlType="submit" icon={<Search size={15} />}>
            查询
          </Button>
          <Button
            icon={<RefreshCw size={15} />}
            onClick={() => {
              form.resetFields();
              onReset();
            }}
          >
            重置
          </Button>
        </Space>
      </Form>
    </div>
  );
}
