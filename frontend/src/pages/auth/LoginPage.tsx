import { Button, Divider, Form, Input, Typography, message } from 'antd';
import { Lock, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appBrandConfig } from '@/config/app';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest } from '@/types/auth';
import { toApiError } from '@/utils/errors';
import { FEISHU_STATE_KEY } from '@/utils/storage';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [form] = Form.useForm<LoginRequest>();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const handleLogin = async (values: LoginRequest) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      form.setFields([{ name: 'password', errors: [toApiError(error).message] }]);
    }
  };

  const handleFeishuLogin = async () => {
    try {
      const { authUrl, state } = await authService.getFeishuAuthUrl();
      // 记录 state，回调时比对，防止登录 CSRF。
      sessionStorage.setItem(FEISHU_STATE_KEY, state);
      window.location.href = authUrl;
    } catch (error) {
      message.error(toApiError(error).message || '获取飞书授权链接失败');
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-panel__box">
          <div className="app-logo__mark">{appBrandConfig.logoText}</div>
          <Typography.Title level={1} className="login-panel__title">
            {appBrandConfig.appName}
          </Typography.Title>
          <div className="login-panel__desc">菜单驱动路由、权限模型与通用 CRUD 工作流</div>
          <Form form={form} layout="vertical" initialValues={{ username: 'admin', password: 'admin123' }} onFinish={handleLogin}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<User size={16} />} placeholder="admin" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<Lock size={16} />} placeholder="admin123" autoComplete="current-password" />
            </Form.Item>
            <Button block type="primary" htmlType="submit" loading={loading}>
              登录工作台
            </Button>
          </Form>

          <Divider plain className="login-panel__divider">
            <span className="login-panel__divider-text">其他登录方式</span>
          </Divider>

          <Button
            block
            className="login-panel__feishu-btn"
            icon={<span className="login-panel__feishu-icon">飞</span>}
            onClick={handleFeishuLogin}
          >
            飞书账号登录
          </Button>
        </div>
      </section>
    </main>
  );
}
