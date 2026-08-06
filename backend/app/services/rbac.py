"""Role-based access control helpers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.crud.menu import build_menu_tree, get_all_enabled_menus, get_menus_by_ids
from app.crud.role import SUPER_ADMIN_ROLE_CODE
from app.models.menu import Menu
from app.models.user import User
from app.schemas.auth import CurrentUser, UserRoleSummary
from app.schemas.menu import MenuNode


def is_super_admin(db: Session, user: User) -> bool:
    """A user is super admin if any *enabled* role has the super_admin code."""
    return any(
        role.code == SUPER_ADMIN_ROLE_CODE and role.status == "enabled"
        for role in user.roles
    )


def user_authorized_menus(db: Session, user: User) -> list[Menu]:
    """Enabled menus the user is authorized to see (all for super admin)."""
    if is_super_admin(db, user):
        return get_all_enabled_menus(db)
    menu_ids = {
        menu.id
        for role in user.roles
        if role.status == "enabled"
        for menu in role.menus
        if menu.enabled
    }
    if not menu_ids:
        return []
    menus = get_menus_by_ids(db, list(menu_ids))
    return [menu for menu in menus if menu.enabled]


def user_permission_codes(db: Session, user: User) -> set[str]:
    """Permission codes (F nodes) the user holds via authorized menus."""
    menus = user_authorized_menus(db, user)
    return {menu.permission_code for menu in menus if menu.type == "F" and menu.permission_code}


def user_menu_codes(db: Session, user: User) -> set[str]:
    """Menu codes of the menus the user is authorized to access."""
    return {menu.menu_code for menu in user_authorized_menus(db, user)}


def build_authorized_menu_tree(db: Session, user: User) -> list[MenuNode]:
    """Authorized menu tree (including F children) for the current user."""
    return build_menu_tree(user_authorized_menus(db, user))


def build_current_user(db: Session, user: User) -> CurrentUser:
    super_admin = is_super_admin(db, user)
    permissions = user_permission_codes(db, user)
    return CurrentUser(
        id=user.id,
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar,
        email=user.email,
        phone=user.phone,
        roles=[UserRoleSummary(id=role.id, code=role.code, name=role.name) for role in user.roles],
        permissions=sorted(permissions),
        isSuperAdmin=super_admin,
    )
