# Frontend

本目录是一个通用的后台管理系统前端脚手架 `admin-react-vite-starter`，提供登录认证、菜单驱动路由、用户 / 角色 / 菜单权限管理等基础能力，可作为企业内部后台、权限后台的起点。本文档面向项目交付、环境启动和二次开发上手；AI 编码约束请看 [AGENTS.md](AGENTS.md)。

## 技术栈

- React 18 + TypeScript + Vite 5
- React Router 6
- Ant Design 5 + lucide-react
- TanStack React Query
- Zustand
- Axios
- Vitest + Testing Library

默认使用 `npm`，不要混用 pnpm、yarn 或 bun。

## 快速开始

```bash
npm install
npm run dev
```

配套后端位于 `../backend`（FastAPI + SQLite），启动方式见后端 README。开发环境通过 Vite proxy 转发 `/api` 到本地 FastAPI（默认 `http://127.0.0.1:8000`）。

登录账号（后端种子数据）：

```text
admin / admin123       # 超级管理员，拥有全部菜单和按钮权限
operator / operator123 # 普通角色，仅部分只读权限
```

常用命令：

```bash
npm run dev           # 连接真实后端 API（vite proxy 转发）
npm run typecheck     # TypeScript 检查
npm run lint          # ESLint 检查
npm run test          # Vitest 测试
npm run build         # 类型检查 + Vite 构建
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需调整：

```env
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

- `VITE_API_BASE_URL`：API 基址，留空=同域 `/api`；填地址=直连后端；填子路径=子路径前缀。
- `VITE_API_PROXY_TARGET`：仅 dev server 代理用，指向本地 FastAPI。
- `VITE_BASE_PATH`：部署子路径（如 `/admin/`），留空=根路径。

## 核心架构

前端采用“后端授权菜单驱动导航 + 前端白名单动态加载页面”：

```text
后端授权菜单树(C/M/F)
  -> 前端归一化 MenuNode[]
  -> 派生侧边栏 / 面包屑 / 菜单搜索 / 默认首页 / 按钮权限
  -> 根据 componentPath 从 src/pages 白名单动态加载页面
```

菜单类型：

- `C`：目录，只承载分组和层级。
- `M`：菜单页面，必须包含 `path` 和 `componentPath`。
- `F`：按钮或功能点，只用于权限判断，不进入侧边栏、面包屑和菜单搜索。
- 所有菜单节点必须包含稳定唯一的 `menuCode`。

页面数据流：

```text
Page / Component -> hooks -> services -> api
```

页面优先调用 `src/services/`，不要直接调用 `src/api/`。

## 目录说明

```text
src/
├── App.tsx                  认证保护、会话恢复、授权菜单加载和动态业务路由
├── main.tsx                 React 根入口、主题、Router、React Query 和 ErrorBoundary
├── api/                     真实 HTTP API 封装（httpClient + auth + system）
├── assets/styles/           全局样式和主题变量
├── components/              跨页面通用组件
├── hooks/                   可复用数据与交互 Hook
├── layout/                  后台壳层布局
├── pages/                   页面模块，业务页面通过 pageResolver 白名单加载
├── services/                接口聚合和字段归一化（auth + system）
├── store/                   认证、菜单、主题和标签视图状态
├── test/                    测试环境初始化
├── types/                   类型和接口契约
└── utils/                   菜单、权限、路径、错误、存储等纯工具
```

关键入口：

- `src/pages/pageResolver.tsx`：业务页面白名单。
- `src/utils/menu.ts`：菜单派生、面包屑、搜索、展开和选中逻辑。
- `src/utils/accessControl.ts`：按钮权限判断。

## 内置能力

- 登录、退出、刷新后会话恢复，Access / Refresh Token 双令牌自动续期。
- 飞书（Feishu）OAuth 登录（需后端配置 FEISHU_APP_ID / FEISHU_APP_SECRET）。
- C/M/F 授权菜单、动态路由、菜单搜索、面包屑和默认首页。
- 页面级访问控制和按钮级权限控制（`PermissionButton` / `useVisibleButtons`）。
- 工作台页面、用户管理、角色管理、菜单管理。
- 角色菜单授权：角色列表回显 `menuIds`，支持勾选 C/M/F 节点并保存授权。
- 响应式后台布局：桌面侧边导航、顶部导航、侧栏折叠、移动端 Drawer。
- 已访问页面标签（TagView）：关闭当前、关闭其他、关闭右侧；工作页按查询参数区分独立标签。
- 全局设置：统一配置主题和布局，支持明暗模式、紧凑模式、主色、侧栏主题和导航模式。
- React Query 分页表格 Hook、通用筛选、表格、行操作和错误状态组件。

## 新增业务页面

1. 新增页面，例如 `src/pages/order/OrderListPage.tsx`。
2. 在后端种子菜单中新增 `M` 节点：

```json
{
  "menuCode": "menu.order.list",
  "type": "M",
  "title": "订单列表",
  "path": "/order/list",
  "componentPath": "order/OrderListPage",
  "permissionCode": "order:list"
}
```

3. 将按钮权限作为该页面的 `F` 子节点：

```json
{
  "menuCode": "action.order.list.order.create",
  "type": "F",
  "title": "新增订单",
  "permissionCode": "order:create"
}
```

4. 页面内使用权限按钮：

```tsx
<PermissionButton permissionCode="order:create">新增订单</PermissionButton>
```

不需要在 `App.tsx` 中新增普通业务 Route。

## 变更检查清单

接口、字段、菜单或权限变化时，至少同步：

- `src/types/`
- `src/api/`
- `src/services/`
- 后端接口、种子菜单数据

## 验收标准

按改动范围选择最小必要验证：

- 类型或接口契约变化：`npm run typecheck`
- 组件、Hook、工具函数变化：`npm run test`
- 样式和交互变化：`npm run dev` 后覆盖桌面、侧栏折叠和移动端
- 发布前或较大改动：`npm run lint && npm run build`

交付时说明已执行的命令、结果、未验证项和风险。
