"""System management endpoints: users, roles, menus."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_menu_access, require_permissions
from app.core.exceptions import AppException
from app.crud import menu as menu_crud
from app.crud import role as role_crud
from app.crud import user as user_crud
from app.models.user import User
from app.schemas.common import PageResult
from app.schemas.menu import SystemMenuItem
from app.schemas.system import (
    MenuCreateRequest,
    MenuQueryParams,
    MenuUpdateRequest,
    RoleCreateRequest,
    RoleItem,
    RoleMenuAssignment,
    RoleQueryParams,
    RoleUpdateRequest,
    UserCreateRequest,
    UserItem,
    UserQueryParams,
    UserUpdateRequest,
)
from app.services.rbac import is_super_admin, user_authorized_menus

router = APIRouter(prefix="/system", tags=["system"])


# ── 用户管理 ─────────────────────────────────────────────────────────────────
@router.get("/users", response_model=PageResult[UserItem])
def list_users(
    params: UserQueryParams = Depends(),
    db: Session = Depends(get_db),
    _user: User = Depends(require_menu_access("menu.system.user")),
) -> PageResult[UserItem]:
    items, total = user_crud.list_users(db, params)
    return PageResult[UserItem](
        items=[user_crud.user_to_item(item) for item in items],
        total=total,
        page=params.page,
        pageSize=params.pageSize,
    )


@router.post("/users", response_model=UserItem)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:user:create")),
) -> UserItem:
    if user_crud.get_user_by_username(db, payload.username):
        raise AppException("用户名已存在", code="USER_USERNAME_DUPLICATE", status_code=409)
    return user_crud.user_to_item(user_crud.create_user(db, payload))


@router.put("/users/{user_id}", response_model=UserItem)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("system:user:update")),
) -> UserItem:
    user = user_crud.get_user(db, user_id)
    if user is None:
        raise AppException("用户不存在", code="USER_NOT_FOUND", status_code=404)
    caller_is_super = is_super_admin(db, current_user)
    target_is_super = is_super_admin(db, user)
    # 非超管不能编辑超管用户
    if target_is_super and not caller_is_super:
        raise AppException("无权修改超级管理员", code="FORBIDDEN", status_code=403)
    # 非超管不能分配 super_admin 角色（防止提权）
    _assert_no_super_admin_assignment(db, payload.roleIds, current_user)
    # 不能禁用自己
    if user.id == current_user.id and payload.status == "disabled":
        raise AppException("不能禁用当前登录用户", code="USER_DISABLE_SELF", status_code=400)
    # 最后一个超级管理员保护：移除超管角色或禁用时必须仍有其他启用超管
    super_role = role_crud.get_role_by_code(db, role_crud.SUPER_ADMIN_ROLE_CODE)
    super_id = super_role.id if super_role else None
    if target_is_super and super_id is not None:
        losing_super = (super_id not in payload.roleIds) or (payload.status == "disabled")
        if losing_super and user_crud.count_enabled_super_admins(db, exclude_user_id=user.id) == 0:
            raise AppException("至少保留一个启用的超级管理员", code="LAST_SUPER_ADMIN", status_code=400)
    return user_crud.user_to_item(user_crud.update_user(db, user, payload))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("system:user:delete")),
) -> Response:
    user = user_crud.get_user(db, user_id)
    if user is None:
        raise AppException("用户不存在", code="USER_NOT_FOUND", status_code=404)
    if user.id == current_user.id:
        raise AppException("不能删除当前登录用户", code="USER_DELETE_SELF", status_code=400)
    # 非超管不能删除超管；最后一个超管不可删除
    if is_super_admin(db, user):
        if not is_super_admin(db, current_user):
            raise AppException("无权删除超级管理员", code="FORBIDDEN", status_code=403)
        if user_crud.count_enabled_super_admins(db, exclude_user_id=user.id) == 0:
            raise AppException("至少保留一个启用的超级管理员", code="LAST_SUPER_ADMIN", status_code=400)
    user_crud.delete_user(db, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── 角色管理 ─────────────────────────────────────────────────────────────────
@router.get("/roles", response_model=PageResult[RoleItem])
def list_roles(
    params: RoleQueryParams = Depends(),
    db: Session = Depends(get_db),
    _user: User = Depends(require_menu_access("menu.system.role")),
) -> PageResult[RoleItem]:
    items, total = role_crud.list_roles(db, params)
    return PageResult[RoleItem](
        items=[role_crud.role_to_item(item) for item in items],
        total=total,
        page=params.page,
        pageSize=params.pageSize,
    )


@router.post("/roles", response_model=RoleItem)
def create_role(
    payload: RoleCreateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:role:create")),
) -> RoleItem:
    if role_crud.get_role_by_code(db, payload.code):
        raise AppException("角色编码已存在", code="ROLE_CODE_DUPLICATE", status_code=409)
    return role_crud.role_to_item(role_crud.create_role(db, payload))


@router.put("/roles/{role_id}", response_model=RoleItem)
def update_role(
    role_id: int,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:role:update")),
) -> RoleItem:
    role = role_crud.get_role(db, role_id)
    if role is None:
        raise AppException("角色不存在", code="ROLE_NOT_FOUND", status_code=404)
    super_code = role_crud.SUPER_ADMIN_ROLE_CODE
    # 禁止把任意角色编码改为 super_admin，或把 super_admin 角色编码改掉
    if payload.code == super_code and role.code != super_code:
        raise AppException("不能将角色编码设为超级管理员", code="ROLE_SUPER_ADMIN_LOCKED", status_code=400)
    if role.code == super_code and payload.code != super_code:
        raise AppException("不能修改超级管理员角色编码", code="ROLE_SUPER_ADMIN_LOCKED", status_code=400)
    # 重复编码检查（DB 唯一约束兜底会抛 500，这里返回语义化的 409）
    if payload.code != role.code:
        existing = role_crud.get_role_by_code(db, payload.code)
        if existing is not None and existing.id != role.id:
            raise AppException("角色编码已存在", code="ROLE_CODE_DUPLICATE", status_code=409)
    return role_crud.role_to_item(role_crud.update_role(db, role, payload))


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:role:delete")),
) -> Response:
    role = role_crud.get_role(db, role_id)
    if role is None:
        raise AppException("角色不存在", code="ROLE_NOT_FOUND", status_code=404)
    if role.code == role_crud.SUPER_ADMIN_ROLE_CODE:
        raise AppException("不能删除超级管理员角色", code="ROLE_SUPER_ADMIN_LOCKED", status_code=400)
    if role.users:
        raise AppException("该角色已分配用户，无法删除", code="ROLE_HAS_USERS", status_code=400)
    role_crud.delete_role(db, role)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/roles/menus", response_model=RoleMenuAssignment)
def assign_role_menus(
    payload: RoleMenuAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("system:role:menus")),
) -> RoleMenuAssignment:
    role = role_crud.get_role(db, payload.roleId)
    if role is None:
        raise AppException("角色不存在", code="ROLE_NOT_FOUND", status_code=404)
    # 非超管只能分配自己已授权的菜单，避免越权授予全量 F 节点
    if not is_super_admin(db, current_user):
        caller_menu_ids = {menu.id for menu in user_authorized_menus(db, current_user)}
        unauthorized = set(payload.menuIds) - caller_menu_ids
        if unauthorized:
            raise AppException("无权分配未授权的菜单", code="FORBIDDEN", status_code=403)
    role_crud.set_role_menus(db, role, payload.menuIds)
    return RoleMenuAssignment(roleId=role.id, menuIds=role_crud.get_role_menu_ids(role))


# ── 菜单管理 ─────────────────────────────────────────────────────────────────
@router.get("/menus", response_model=list[SystemMenuItem])
def list_menus(
    params: MenuQueryParams = Depends(),
    db: Session = Depends(get_db),
    _user: User = Depends(require_menu_access("menu.system.menu")),
) -> list[SystemMenuItem]:
    return menu_crud.filter_menus_for_management(db, params)


@router.post("/menus", response_model=SystemMenuItem)
def create_menu(
    payload: MenuCreateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:menu:create")),
) -> SystemMenuItem:
    menu = menu_crud.create_menu(db, payload)
    return menu_crud.menu_to_system_item(menu)


@router.put("/menus/{menu_id}", response_model=SystemMenuItem)
def update_menu(
    menu_id: int,
    payload: MenuUpdateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:menu:update")),
) -> SystemMenuItem:
    menu = menu_crud.get_menu(db, menu_id)
    if menu is None:
        raise AppException("菜单不存在", code="MENU_NOT_FOUND", status_code=404)
    menu_crud.update_menu(db, menu, payload)
    return menu_crud.menu_to_system_item(menu)


@router.delete("/menus/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permissions("system:menu:delete")),
) -> Response:
    menu = menu_crud.get_menu(db, menu_id)
    if menu is None:
        raise AppException("菜单不存在", code="MENU_NOT_FOUND", status_code=404)
    menu_crud.delete_menu(db, menu)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _assert_no_super_admin_assignment(db: Session, role_ids: list[int], current_user: User) -> None:
    """非超级管理员不能把 super_admin 角色分配给任何用户（防止越权提权）。"""
    if is_super_admin(db, current_user):
        return
    super_role = role_crud.get_role_by_code(db, role_crud.SUPER_ADMIN_ROLE_CODE)
    if super_role is not None and super_role.id in role_ids:
        raise AppException("无权分配超级管理员角色", code="ROLE_SUPER_ADMIN_LOCKED", status_code=403)
