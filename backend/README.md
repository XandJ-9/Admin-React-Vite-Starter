# Backend

FastAPI + SQLAlchemy 后端，为 `../frontend` 脚手架提供登录认证、菜单驱动权限和用户 / 角色 / 菜单管理。使用 [uv](https://docs.astral.sh/uv/) 管理依赖，默认 SQLite，可平滑切换 PostgreSQL。

## 技术栈

- Python 3.12 + FastAPI + Uvicorn
- SQLAlchemy 2.0（同步）
- Pydantic v2 + pydantic-settings
- bcrypt（密码哈希）+ PyJWT（令牌）
- httpx（飞书 OAuth 调用）
- pytest / ruff（开发依赖）

## 快速开始

```bash
cd backend
cp .env.example .env          # 按需修改配置
uv sync                        # 创建虚拟环境并安装依赖
uv run uvicorn app.main:app --reload --port 8000
```

启动后访问：

- API：http://127.0.0.1:8000/api/v1
- 交互式文档：http://127.0.0.1:8000/docs
- 健康检查：http://127.0.0.1:8000/health

首次启动会自动建表并写入种子数据（角色、用户、菜单）。

种子账号：

```text
admin / admin123       # 超级管理员
operator / operator123 # 普通操作员（仅查看）
```

## 配置

复制 `.env.example` 为 `.env` 后按需调整：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接串，切换 PG 用 `postgresql+psycopg://...` | `sqlite:///./db/app.db` |
| `JWT_SECRET` | JWT 签名密钥（生产必改） | 内置占位 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌有效期（分钟） | 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 刷新令牌有效期（天） | 7 |
| `CORS_ORIGINS` | 允许的前端来源，逗号分隔 | `http://localhost:5173,...` |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书 OAuth 凭证，留空则飞书登录返回“未配置” | 空 |
| `FEISHU_REDIRECT_URI` | 飞书回调地址 | `http://localhost:5173/auth/feishu/callback` |

## API 概览

成功响应直接返回数据体（与前端 `httpClient` 约定一致），错误响应统一为 `{"message", "code", "traceId"}`。

### 认证 `/api/v1/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 用户名密码登录，返回 access/refresh token 和当前用户 |
| POST | `/auth/logout` | 退出（无状态，客户端丢弃令牌） |
| GET | `/auth/me` | 获取当前用户 |
| GET | `/auth/menus` | 获取当前用户授权菜单树（含 F 子节点，用于按钮权限） |
| POST | `/auth/refresh` | 刷新访问令牌 |
| GET | `/auth/feishu/auth-url` | 获取飞书授权链接（未配置时 503） |
| POST | `/auth/feishu/login` | 飞书授权码登录，自动创建用户 |

### 系统管理 `/api/v1/system`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/system/users` | 菜单 `menu.system.user` | 用户分页列表 |
| POST | `/system/users` | `system:user:create` | 新增用户 |
| PUT | `/system/users/:id` | `system:user:update` | 编辑用户 |
| DELETE | `/system/users/:id` | `system:user:delete` | 删除用户（不可删自己） |
| GET | `/system/roles` | 菜单 `menu.system.role` | 角色分页列表（含 `menuIds`） |
| POST | `/system/roles` | `system:role:create` | 新增角色 |
| PUT | `/system/roles/:id` | `system:role:update` | 编辑角色 |
| DELETE | `/system/roles/:id` | `system:role:delete` | 删除角色（不可删超管 / 已分配用户） |
| POST | `/system/roles/menus` | `system:role:menus` | 角色菜单授权 |
| GET | `/system/menus` | 菜单 `menu.system.menu` | 菜单树（管理用） |
| POST | `/system/menus` | `system:menu:create` | 新增菜单 |
| PUT | `/system/menus/:id` | `system:menu:update` | 编辑菜单 |
| DELETE | `/system/menus/:id` | `system:menu:delete` | 删除菜单（有子菜单时禁止） |

## 权限模型

- 菜单类型：`C` 目录 / `M` 菜单页面 / `F` 按钮功能点。
- 角色授权一组菜单 ID（C/M/F 独立勾选，前端不为 F 自动补齐上级页面）。
- 超级管理员（`super_admin` 角色）拥有全部菜单和按钮权限；后端仍做真实校验。
- 普通用户：`/auth/menus` 返回其授权菜单树；`/auth/me` 返回 `permissions`（F 节点权限码）。
- 列表接口由“菜单访问权限”控制，写接口由“按钮权限码”控制。

## 项目结构

```text
backend/
├── pyproject.toml          # uv 依赖与配置
├── .env.example
├── app/
│   ├── main.py             # FastAPI 入口、CORS、异常处理、启动建表
│   ├── core/               # config / db / security / deps / exceptions
│   ├── models/             # SQLAlchemy 模型（user, role, menu）
│   ├── schemas/            # Pydantic 契约（camelCase 对齐前端）
│   ├── crud/               # 数据访问与树构建
│   ├── services/           # rbac + auth_service（含飞书 OAuth）
│   ├── api/v1/             # auth / system 路由
│   └── seed.py             # 建表 + 种子数据
└── tests/                  # pytest 冒烟测试
```

## 开发命令

```bash
uv sync                     # 安装依赖
uv run pytest               # 运行测试
uv run ruff check app       # 静态检查
uv run ruff format app      # 格式化
uv run uvicorn app.main:app --reload
```

## 切换到 PostgreSQL

1. 安装驱动：`uv add psycopg[binary]`。
2. 修改 `.env`：`DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname`。
3. 删除 `db/app.db`（如已生成），重启即可自动建表。

> 当前使用 `create_all` 建表，未引入 Alembic 迁移；表结构稳定后建议接入 Alembic 做版本化迁移。
