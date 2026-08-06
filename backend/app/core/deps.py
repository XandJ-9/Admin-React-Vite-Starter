"""Shared FastAPI dependencies: auth and RBAC access control."""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.exceptions import AppException
from app.core.security import InvalidTokenError, decode_token
from app.crud.user import get_user
from app.models.user import User
from app.services.rbac import is_super_admin, user_menu_codes, user_permission_codes


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the current user from a Bearer access token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppException("未认证", code="UNAUTHORIZED", status_code=401)
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except InvalidTokenError as exc:
        raise AppException("登录已过期，请重新登录", code="INVALID_TOKEN", status_code=401) from exc
    if payload.get("type") != "access":
        raise AppException("无效的访问令牌", code="INVALID_TOKEN", status_code=401)
    user_id = payload.get("sub")
    if not user_id:
        raise AppException("无效的访问令牌", code="INVALID_TOKEN", status_code=401)
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError) as exc:
        raise AppException("无效的访问令牌", code="INVALID_TOKEN", status_code=401) from exc
    user = get_user(db, user_id_int)
    if user is None:
        raise AppException("用户不存在", code="USER_NOT_FOUND", status_code=401)
    # 令牌版本校验：logout / 改密后 token_version 递增，旧令牌立即失效。
    if payload.get("ver") != user.token_version:
        raise AppException("登录已过期，请重新登录", code="INVALID_TOKEN", status_code=401)
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    """Ensure the current user account is enabled."""
    if user.status != "enabled":
        raise AppException("账号已禁用", code="ACCOUNT_DISABLED", status_code=403)
    return user


def require_permissions(*codes: str) -> Callable[..., User]:
    """Dependency factory: allow super admins or users holding any of the given permission codes."""

    def _checker(
        user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        if is_super_admin(db, user):
            return user
        perms = user_permission_codes(db, user)
        if not any(code in perms for code in codes):
            raise AppException("没有操作权限", code="FORBIDDEN", status_code=403)
        return user

    return _checker


def require_menu_access(menu_code: str) -> Callable[..., User]:
    """Dependency factory: allow super admins or users authorized for the given menu code."""

    def _checker(
        user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        if is_super_admin(db, user):
            return user
        codes = user_menu_codes(db, user)
        if menu_code not in codes:
            raise AppException("没有访问权限", code="FORBIDDEN", status_code=403)
        return user

    return _checker
