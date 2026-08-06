import { Result, Spin, message } from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { toApiError } from '@/utils/errors';
import { FEISHU_STATE_KEY } from '@/utils/storage';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const feishuLogin = useAuthStore((state) => state.feishuLogin);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      message.error('授权参数缺失，请重新登录');
      navigate('/login', { replace: true });
      return;
    }

    // 比对 state：防止登录 CSRF。state 由后端签发、发起授权前存入 sessionStorage。
    const expectedState = sessionStorage.getItem(FEISHU_STATE_KEY);
    sessionStorage.removeItem(FEISHU_STATE_KEY);
    if (!expectedState || expectedState !== state) {
      message.error('登录状态校验失败，请重新登录');
      navigate('/login', { replace: true });
      return;
    }

    feishuLogin({ code, state: state ?? '' })
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch((error) => {
        message.error(toApiError(error).message || '飞书登录失败');
        navigate('/login', { replace: true });
      });
  }, [searchParams, feishuLogin, navigate]);

  return (
    <div className="center-screen">
      <Result icon={<Spin size="large" />} title="飞书登录中" subTitle="正在通过飞书账号认证，请稍候..." />
    </div>
  );
}
