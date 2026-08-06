"""Role CRUD operations."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.menu import Menu
from app.models.user import Role
from app.schemas.system import RoleCreateRequest, RoleItem, RoleQueryParams, RoleUpdateRequest

SUPER_ADMIN_ROLE_CODE = "super_admin"


def get_role(db: Session, role_id: int) -> Role | None:
    return db.get(Role, role_id)


def get_role_by_code(db: Session, code: str) -> Role | None:
    return db.scalar(select(Role).where(Role.code == code))


def list_roles(db: Session, params: RoleQueryParams) -> tuple[list[Role], int]:
    query = select(Role)
    if params.keyword:
        keyword = f"%{params.keyword.lower()}%"
        query = query.where(
            or_(
                func.lower(Role.code).like(keyword),
                func.lower(Role.name).like(keyword),
            )
        )
    if params.status:
        query = query.where(Role.status == params.status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    sort_columns = {
        "code": Role.code,
        "name": Role.name,
        "createdAt": Role.created_at,
        "updatedAt": Role.updated_at,
    }
    sort_col = sort_columns.get(params.sortBy or "")
    if sort_col is not None:
        query = query.order_by(sort_col.desc() if params.sortOrder == "descend" else sort_col.asc())
    else:
        query = query.order_by(Role.id.asc())

    page = max(params.page, 1)
    page_size = max(params.pageSize, 1)
    query = query.offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(query).unique())
    return items, total


def create_role(db: Session, payload: RoleCreateRequest) -> Role:
    role = Role(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        status=payload.status,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role: Role, payload: RoleUpdateRequest) -> Role:
    role.code = payload.code
    role.name = payload.name
    role.description = payload.description
    role.status = payload.status
    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role: Role) -> None:
    db.delete(role)
    db.commit()


def set_role_menus(db: Session, role: Role, menu_ids: list[int]) -> Role:
    menus: list[Menu] = []
    if menu_ids:
        menus = list(db.scalars(select(Menu).where(Menu.id.in_(menu_ids))))
    role.menus = menus
    db.commit()
    db.refresh(role)
    return role


def get_role_menu_ids(role: Role) -> list[int]:
    return [menu.id for menu in role.menus]


def role_to_item(role: Role) -> RoleItem:
    return RoleItem(
        id=role.id,
        code=role.code,
        name=role.name,
        description=role.description,
        status=role.status,  # type: ignore[arg-type]
        menuIds=get_role_menu_ids(role),
        createdAt=role.created_at.isoformat() if role.created_at else None,
        updatedAt=role.updated_at.isoformat() if role.updated_at else None,
    )
