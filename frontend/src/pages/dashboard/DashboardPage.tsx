import { Alert, Timeline } from 'antd';
import { PageShell } from '@/components/PageShell';

function DashboardPage() {
  return (
    <PageShell>
      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-card__label">授权页面</div>
          <div className="metric-card__value">4</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">样板用户</div>
          <div className="metric-card__value">2</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">权限模型</div>
          <div className="metric-card__value">C/M/F</div>
        </div>
      </div>
      <div className="table-panel form-panel">
        <Alert type="info" showIcon message="系统管理模块已开放，后续业务页面可复用当前布局、请求封装和权限处理。" />
        <Timeline
          style={{ marginTop: 18 }}
          items={[
            { color: 'green', children: '菜单驱动路由与按钮权限已接入' },
            { color: 'blue', children: '用户、角色、菜单维护形成基础闭环' },
            { color: 'gray', children: '业务模块可按同一页面壳层扩展' },
          ]}
        />
      </div>
    </PageShell>
  );
}

export default DashboardPage;
