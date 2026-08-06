# Frontend Agent Guide

本文件是前端目录的 AI coding 约束，面向 GitHub Copilot、Claude Code 以及其他自动化编码代理。运行方式、环境变量和新增页面示例见 [README.md](README.md)；本文件只保留架构边界、开发规则和验收要求，避免与 README 重复。

## 阅读顺序

1. [README.md](README.md)：启动、运行模式、功能范围和二开入口。
2. 后端 `../backend/README.md`：接口契约、种子数据和启动方式。

若文档冲突，按“用户当前指令 > 本文件 > README > 代码现状”的顺序处理，并优先让代码和文档重新一致。

## 不可破坏的架构约束

- 业务页面由授权菜单的 `M` 节点和 `componentPath` 接入，不在 `App.tsx` 手写普通业务 Route。
- `C` 节点只做目录；`M` 节点加载页面；`F` 节点只做按钮权限，不进入侧边栏、面包屑或菜单搜索。
- `componentPath` 必须对应 `src/pages/pageResolver.tsx` 的白名单路径，不带 `src/pages` 前缀。
- 页面优先调用 `src/services/`，不要直接调用 `src/api/`。
- 菜单派生逻辑集中在 `src/utils/menu.ts`；按钮权限逻辑集中在 `src/utils/accessControl.ts`。
- 超级管理员 `isSuperAdmin` 默认拥有全部按钮权限，但后端仍必须做真实权限校验。

## 代码分层规则

- `pages/`：页面组合、筛选条件、弹窗状态和局部交互。
- `components/`：跨页面通用 UI，不写业务 API 细节。
- `hooks/`：复用数据请求和交互模式，例如分页表格、mutation、按钮可见性。
- `services/`：接口聚合、字段归一化，是页面调用接口的唯一入口。
- `api/`：真实 HTTP 请求路径和参数，不写页面逻辑。
- `types/`：接口契约来源，新增字段先同步类型。
- `store/`：跨页面状态。页面不要直接操作 `localStorage`，会话读写走 `src/utils/storage.ts`。

## 推荐复用入口

- 页面外壳：`PageShell`
- 表格面板：`DataTablePanel`
- 筛选区：`FilterToolbar`
- 行操作：`RowActions`
- 权限按钮：`PermissionButton` 或 `useVisibleButtons`
- 异步写操作：`useApiMutation`
- 菜单图标：`IconSelect`、`LucideIconView`、`lucideIcons`
- 错误转换：`toApiError(error).message`

优先复用现有组件、Hook、service 和工具函数；不要为单个页面复制权限、菜单、分页或错误处理逻辑。

## 接口和权限变更清单

涉及字段、接口、菜单、按钮权限时，同时检查：

- `src/types/`
- `src/api/`
- `src/services/`
- 后端接口、种子菜单数据
- 页面权限按钮和 `permissionCode`

角色授权的当前约定：角色列表返回 `menuIds`；C/M/F 节点独立授权和保存，前端不得为 F 节点自动补齐上级页面节点，避免数据或功能权限隐式开放页面；真实后端必须能回显最新授权。

## UI 和响应式规则

- 保持后台系统风格：信息清晰、控件紧凑、可扫描、可持续使用。
- 避免营销页式 hero、大装饰背景和过度卡片化。
- 图标优先使用 `lucide-react`；已有 Ant Design 图标可继续沿用。
- 全局布局样式集中在 `src/assets/styles/global.css`，修改前先找可复用 class。
- 响应式需覆盖桌面侧栏折叠、移动端 Drawer、长文本、表格横向滚动和弹窗高度。
- 修改 Ant Design class 覆盖时保持作用域，避免影响登录页、移动端 Drawer 或表格弹层。

## 测试和验证

按改动风险选择验证：

- 类型或契约变化：至少 `npm run typecheck`。
- 组件、Hook、工具函数变化：`npm run test`，必要时补充 Vitest/Testing Library 测试。
- API 分层变化：验证 `services` 与 `api` 调用一致。
- 样式和交互变化：启动 `npm run dev` 做浏览器验证，覆盖桌面、侧栏折叠、移动端和异常/空数据状态。
- 发布前或较大改动：`npm run lint && npm run build`。

## 文档职责

- [README.md](README.md)：给开发者看的启动、架构概览、二开流程和验收标准。

完成任务前，确保代码、测试和 README/AGENTS 之间没有新增冲突。
