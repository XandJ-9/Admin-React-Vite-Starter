"""User CRUD operations."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.crud.role import SUPER_ADMIN_ROLE_CODE
from app.models.user import Role, User, user_roles
from app.schemas.system import UserCreateRequest, UserItem, UserQueryParams, UserUpdateRequest


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def get_user_by_feishu_open_id(db: Session, open_id: str) -> User | None:
    return db.scalar(select(User).where(User.feishu_open_id == open_id))


def list_users(db: Session, params: UserQueryParams) -> tuple[list[User], int]:
    query = select(User)
    if params.keyword:
        keyword = f"%{params.keyword.lower()}%"
        query = query.where(
            or_(
                func.lower(User.username).like(keyword),
                func.lower(User.nickname).like(keyword),
            )
        )
    if params.status:
        query = query.where(User.status == params.status)
    if params.roleId:
        query = query.join(user_roles).where(user_roles.c.role_id == params.roleId)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    sort_columns = {
        "username": User.username,
        "nickname": User.nickname,
        "createdAt": User.created_at,
        "updatedAt": User.updated_at,
    }
    sort_col = sort_columns.get(params.sortBy or "")
    if sort_col is not None:
        query = query.order_by(sort_col.desc() if params.sortOrder == "descend" else sort_col.asc())
    else:
        query = query.order_by(User.id.asc())

    page = max(params.page, 1)
    page_size = max(params.pageSize, 1)
    query = query.offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(query).unique())
    return items, total


def create_user(db: Session, payload: UserCreateRequest) -> User:
    user = User(
        username=payload.username,
        nickname=payload.nickname,
        password_hash=hash_password(payload.password),
        email=payload.email,
        phone=payload.phone,
        status=payload.status,
    )
    _sync_user_roles(db, user, payload.roleIds)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, payload: UserUpdateRequest) -> User:
    user.nickname = payload.nickname
    user.email = payload.email
    user.phone = payload.phone
    user.status = payload.status
    _sync_user_roles(db, user, payload.roleIds)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def update_last_login(db: Session, user: User) -> None:
    user.last_login_at = datetime.now(UTC)
    db.commit()


def bump_token_version(db: Session, user: User) -> None:
    """递增令牌版本，使该用户已签发的所有 access/refresh 令牌立即失效。"""
    user.token_version = (user.token_version or 0) + 1
    db.commit()


def count_enabled_super_admins(db: Session, exclude_user_id: int | None = None) -> int:
    """统计启用状态的超级管理员数量（用于"最后一个超管"保护）。"""
    query = (
        select(func.count(User.id))
        .join(user_roles, user_roles.c.user_id == User.id)
        .join(Role, Role.id == user_roles.c.role_id)
        .where(Role.code == SUPER_ADMIN_ROLE_CODE, User.status == "enabled")
    )
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    return db.scalar(query) or 0


def _sync_user_roles(db: Session, user: User, role_ids: list[int]) -> None:
    from app.models.user import Role

    roles: list[Role] = []
    if role_ids:
        roles = list(db.scalars(select(Role).where(Role.id.in_(role_ids))))
    user.roles = roles


def user_to_item(user: User) -> UserItem:
    return UserItem(
        id=user.id,
        username=user.username,
        nickname=user.nickname,
        email=user.email,
        phone=user.phone,
        avatar=user.avatar,
        status=user.status,  # type: ignore[arg-type]
        roleIds=[role.id for role in user.roles],
        roleNames=[role.name for role in user.roles],
        lastLoginAt=user.last_login_at.isoformat() if user.last_login_at else None,
        createdAt=user.created_at.isoformat() if user.created_at else None,
        updatedAt=user.updated_at.isoformat() if user.updated_at else None,
    )
