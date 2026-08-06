# Admin React Vite Starter

一个开箱即用的后台管理系统脚手架，前后端分离、菜单驱动路由、完整的 C/M/F 权限模型。

- **前端**：React 18 + TypeScript + Vite 5 + Ant Design 5 + TanStack Query + Zustand + React Router 6
- **后端**：FastAPI + SQLAlchemy 2.0 + SQLite（可切换 PostgreSQL）+ JWT + uv 包管理

## 仓库结构

```text
.
├── frontend/   # React + Vite 管理后台脚手架
└── backend/    # FastAPI 后端（认证 + 用户/角色/菜单 RBAC + 飞书 OAuth）
```

详细的启动方式、架构和二开说明见各子目录的 README：

- [frontend/README.md](frontend/README.md)
- [backend/README.md](backend/README.md)

## 核心能力

- 登录认证、Access/Refresh 双令牌、刷新自动续期、**logout 即刻吊销令牌**（token_version 机制）。
- 飞书（Feishu）OAuth 登录（需配置 `FEISHU_APP_ID/SECRET`，含 state 防 CSRF）。
- 后端授权菜单树驱动前端路由：`C` 目录 / `M` 菜单页面 / `F` 按钮功能点。
- 页面级访问控制 + 按钮级权限控制（`PermissionButton` / `useVisibleButtons`）。
- 用户管理、角色管理、菜单管理、角色菜单授权。
- 响应式后台布局：侧边/顶部导航、侧栏折叠、移动端 Drawer、已访问标签。
- 全局主题设置：明暗模式、紧凑模式、主色、侧栏主题。
- 登录限流（slowapi）、统一错误信封、参数校验。

## 快速开始

```bash
# 1. 后端
cd backend
cp .env.example .env          # 按需修改（生产必改 JWT_SECRET）
uv sync
uv run uvicorn app.main:app --reload    # http://127.0.0.1:8000  （docs: /docs）

# 2. 前端（另开终端）
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

首次启动后端会自动建表并写入种子数据。登录账号：

```text
admin / admin123       # 超级管理员
operator / operator123 # 普通操作员（仅查看）
```

> 前端开发环境通过 Vite proxy 把 `/api` 转发到本地 FastAPI（默认 `http://127.0.0.1:8000`）。

## 新增业务页面

1. 新建页面，例如 `frontend/src/pages/order/OrderListPage.tsx`。
2. 在后端种子菜单中新增 `M` 节点（`path` + `componentPath`），按钮权限作为其 `F` 子节点。
3. 页面内使用 `<PermissionButton permissionCode="order:create">新增</PermissionButton>`。

无需在 `App.tsx` 手写业务路由——由授权菜单的 `componentPath` 经 `pageResolver` 白名单动态加载。

## 切换到 PostgreSQL

```bash
cd backend
uv add "psycopg[binary]"
# .env: DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
```

## License

MIT
