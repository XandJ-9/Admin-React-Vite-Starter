import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="center-screen">
      <Result
        status="403"
        title="403"
        subTitle="你没有权限访问该页面。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
}
