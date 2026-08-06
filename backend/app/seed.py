"""Database initialization and seed data.

Idempotent: safe to run on every startup. Creates tables, the super_admin and
operator roles, the admin/operator seed users, and the C/M/F menu tree.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401  -- register all models on Base.metadata
from app.core.config import settings
from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.menu import Menu
from app.models.user import Role, User

SUPER_ADMIN_ROLE_CODE = "super_admin"
OPERATOR_ROLE_CODE = "operator"

# 每条菜单可使用 ``parent`` 指向上级 menuCode，便于维护层级。
SEED_MENUS: list[dict[str, Any]] = [
    # 工作台目录
    {"menuCode": "menu.workspace", "type": "C", "title": "工作台", "icon": "LayoutDashboard", "order": 1},
    {
        "menuCode": "menu.dashboard",
        "parent": "menu.workspace",
        "type": "M",
        "title": "工作台",
        "path": "/dashboard",
        "componentPath": "dashboard/DashboardPage",
        "icon": "LayoutDashboard",
        "order": 1,
        "tagViewEnabled": True,
        "keepAliveEnabled": False,
    },
    # 系统管理目录
    {"menuCode": "menu.system", "type": "C", "title": "系统管理", "icon": "Settings", "order": 2},
    {
        "menuCode": "menu.system.user",
        "parent": "menu.system",
        "type": "M",
        "title": "用户管理",
        "path": "/system/users",
        "componentPath": "system/UserManagementPage",
        "icon": "Users",
        "order": 1,
    },
    {"menuCode": "action.system.user.create", "parent": "menu.system.user", "type": "F", "title": "新增用户", "permissionCode": "system:user:create", "order": 1},
    {"menuCode": "action.system.user.update", "parent": "menu.system.user", "type": "F", "title": "编辑用户", "permissionCode": "system:user:update", "order": 2},
    {"menuCode": "action.system.user.delete", "parent": "menu.system.user", "type": "F", "title": "删除用户", "permissionCode": "system:user:delete", "order": 3},
    {
        "menuCode": "menu.system.role",
        "parent": "menu.system",
        "type": "M",
        "title": "角色管理",
        "path": "/system/roles",
        "componentPath": "system/RoleManagementPage",
        "icon": "ShieldCheck",
        "order": 2,
    },
    {"menuCode": "action.system.role.create", "parent": "menu.system.role", "type": "F", "title": "新增角色", "permissionCode": "system:role:create", "order": 1},
    {"menuCode": "action.system.role.update", "parent": "menu.system.role", "type": "F", "title": "编辑角色", "permissionCode": "system:role:update", "order": 2},
    {"menuCode": "action.system.role.delete", "parent": "menu.system.role", "type": "F", "title": "删除角色", "permissionCode": "system:role:delete", "order": 3},
    {"menuCode": "action.system.role.menus", "parent": "menu.system.role", "type": "F", "title": "角色授权", "permissionCode": "system:role:menus", "order": 4},
    {
        "menuCode": "menu.system.menu",
        "parent": "menu.system",
        "type": "M",
        "title": "菜单管理",
        "path": "/system/menus",
        "componentPath": "system/MenuManagementPage",
        "icon": "Menu",
        "order": 3,
    },
    {"menuCode": "action.system.menu.create", "parent": "menu.system.menu", "type": "F", "title": "新增菜单", "permissionCode": "system:menu:create", "order": 1},
    {"menuCode": "action.system.menu.update", "parent": "menu.system.menu", "type": "F", "title": "编辑菜单", "permissionCode": "system:menu:update", "order": 2},
    {"menuCode": "action.system.menu.delete", "parent": "menu.system.menu", "type": "F", "title": "删除菜单", "permissionCode": "system:menu:delete", "order": 3},
]

OPERATOR_MENU_CODES = {
    "menu.workspace",
    "menu.dashboard",
    "menu.system",
    "menu.system.user",
    "menu.system.role",
    "menu.system.menu",
}


def init_database() -> None:
    """Create the SQLite directory (if needed), tables, and seed data."""
    if settings.is_sqlite:
        Path("./db").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)


def seed(db: Session) -> None:
    super_role = db.scalar(select(Role).where(Role.code == SUPER_ADMIN_ROLE_CODE))
    if super_role is None:
        super_role = Role(code=SUPER_ADMIN_ROLE_CODE, name="超级管理员", description="拥有全部权限", status="enabled")
        db.add(super_role)

    operator_role = db.scalar(select(Role).where(Role.code == OPERATOR_ROLE_CODE))
    if operator_role is None:
        operator_role = Role(code=OPERATOR_ROLE_CODE, name="普通操作员", description="仅查看权限", status="enabled")
        db.add(operator_role)
    db.flush()

    if db.scalar(select(Menu).limit(1)) is None:
        code_to_menu: dict[str, Menu] = {}
        for item in SEED_MENUS:
            parent_code = item.get("parent")
            menu = Menu(
                menu_code=item["menuCode"],
                parent_id=code_to_menu[parent_code].id if parent_code else None,
                type=item["type"],
                title=item["title"],
                path=item.get("path"),
                component_path=item.get("componentPath"),
                icon=item.get("icon"),
                permission_code=item.get("permissionCode"),
                sort_order=item.get("order", 0),
                visible=item.get("visible", True),
                enabled=item.get("enabled", True),
                tag_view_enabled=item.get("tagViewEnabled", True),
                keep_alive_enabled=item.get("keepAliveEnabled", False),
            )
            db.add(menu)
            db.flush()
            code_to_menu[menu.menu_code] = menu

    admin = db.scalar(select(User).where(User.username == "admin"))
    if admin is None:
        admin = User(
            username="admin",
            nickname="超级管理员",
            password_hash=hash_password("admin123"),
            email="admin@example.com",
            status="enabled",
            roles=[super_role],
        )
        db.add(admin)

    operator = db.scalar(select(User).where(User.username == "operator"))
    if operator is None:
        operator = User(
            username="operator",
            nickname="操作员",
            password_hash=hash_password("operator123"),
            status="enabled",
            roles=[operator_role],
        )
        db.add(operator)
    db.flush()

    all_menus = list(db.scalars(select(Menu)))
    if super_role is not None and not super_role.menus:
        super_role.menus = list(all_menus)
    if operator_role is not None and not operator_role.menus:
        operator_role.menus = [menu for menu in all_menus if menu.menu_code in OPERATOR_MENU_CODES]

    db.commit()
