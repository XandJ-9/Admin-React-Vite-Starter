"""Menu CRUD operations and tree builders."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.menu import Menu
from app.schemas.menu import MenuNode, SystemMenuItem
from app.schemas.system import MenuCreateRequest, MenuQueryParams, MenuUpdateRequest


def get_menu(db: Session, menu_id: int) -> Menu | None:
    return db.get(Menu, menu_id)


def get_menu_by_code(db: Session, code: str) -> Menu | None:
    return db.scalar(select(Menu).where(Menu.menu_code == code))


def list_all_menus(db: Session) -> list[Menu]:
    return list(db.scalars(select(Menu).order_by(Menu.sort_order.asc(), Menu.id.asc())))


def get_all_enabled_menus(db: Session) -> list[Menu]:
    return list(
        db.scalars(
            select(Menu)
            .where(Menu.enabled.is_(True))
            .order_by(Menu.sort_order.asc(), Menu.id.asc())
        )
    )


def get_menus_by_ids(db: Session, menu_ids: list[int]) -> list[Menu]:
    if not menu_ids:
        return []
    return list(db.scalars(select(Menu).where(Menu.id.in_(menu_ids))))


def get_descendant_ids(db: Session, menu_id: int) -> set[int]:
    """Return all descendant menu ids of ``menu_id`` (BFS)."""
    result: set[int] = set()
    frontier = [menu_id]
    while frontier:
        child_ids = list(db.scalars(select(Menu.id).where(Menu.parent_id.in_(frontier))))
        new_ids = [cid for cid in child_ids if cid not in result]
        if not new_ids:
            break
        result.update(new_ids)
        frontier = new_ids
    return result


def _assert_parent_exists(db: Session, parent_id: int | None) -> None:
    if parent_id is not None and get_menu(db, parent_id) is None:
        raise AppException("父级菜单不存在", code="MENU_PARENT_NOT_FOUND", status_code=404)


def create_menu(db: Session, payload: MenuCreateRequest) -> Menu:
    if get_menu_by_code(db, payload.menuCode):
        raise AppException("菜单编码已存在", code="MENU_CODE_DUPLICATE", status_code=409)
    _assert_parent_exists(db, payload.parentId)
    menu = Menu(
        menu_code=payload.menuCode,
        parent_id=payload.parentId,
        type=payload.type,
        title=payload.title,
        path=payload.path,
        component_path=payload.componentPath,
        icon=payload.icon,
        permission_code=payload.permissionCode,
        sort_order=payload.order,
        visible=payload.visible,
        enabled=payload.enabled,
        tag_view_enabled=payload.tagViewEnabled,
        keep_alive_enabled=payload.keepAliveEnabled,
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


def update_menu(db: Session, menu: Menu, payload: MenuUpdateRequest) -> Menu:
    if payload.menuCode != menu.menu_code and get_menu_by_code(db, payload.menuCode):
        raise AppException("菜单编码已存在", code="MENU_CODE_DUPLICATE", status_code=409)
    _assert_parent_exists(db, payload.parentId)
    if payload.parentId is not None and payload.parentId == menu.id:
        raise AppException("不能将菜单的上级设为自身", code="MENU_PARENT_INVALID", status_code=400)
    if payload.parentId is not None and payload.parentId in get_descendant_ids(db, menu.id):
        raise AppException("不能将菜单的上级设为自身的子节点", code="MENU_PARENT_INVALID", status_code=400)

    menu.menu_code = payload.menuCode
    menu.parent_id = payload.parentId
    menu.type = payload.type
    menu.title = payload.title
    menu.path = payload.path
    menu.component_path = payload.componentPath
    menu.icon = payload.icon
    menu.permission_code = payload.permissionCode
    menu.sort_order = payload.order
    menu.visible = payload.visible
    menu.enabled = payload.enabled
    menu.tag_view_enabled = payload.tagViewEnabled
    menu.keep_alive_enabled = payload.keepAliveEnabled
    db.commit()
    db.refresh(menu)
    return menu


def delete_menu(db: Session, menu: Menu) -> None:
    if menu.children:
        raise AppException("存在子菜单，无法删除，请先删除子菜单", code="MENU_HAS_CHILDREN", status_code=400)
    db.delete(menu)
    db.commit()


def filter_menus_for_management(db: Session, params: MenuQueryParams) -> list[SystemMenuItem]:
    """Return the menu tree for the management page, applying optional filters."""
    all_menus = list_all_menus(db)
    by_id_all = {m.id: m for m in all_menus}

    has_structural_filter = bool(
        params.type or params.enabled is not None or params.visible is not None
    )

    if params.keyword or has_structural_filter:
        if params.keyword:
            kw = params.keyword.lower()
            matched = {
                m.id
                for m in all_menus
                if any(
                    kw in (value or "").lower()
                    for value in (m.title, m.menu_code, m.path, m.component_path, m.permission_code)
                )
            }
        else:
            matched = {m.id for m in all_menus}
            if params.type:
                matched = {mid for mid in matched if by_id_all[mid].type == params.type}
            if params.enabled is not None:
                matched = {mid for mid in matched if by_id_all[mid].enabled == params.enabled}
            if params.visible is not None:
                matched = {mid for mid in matched if by_id_all[mid].visible == params.visible}

        # 命中节点及其祖先保留，使树结构连贯（同时修复 type=F 仅返回空树的问题）。
        keep: set[int] = set()
        for mid in matched:
            cursor = mid
            while cursor is not None and cursor not in keep:
                keep.add(cursor)
                cursor = by_id_all[cursor].parent_id if cursor in by_id_all else None
        menus = [m for m in all_menus if m.id in keep]
        return build_system_menu_tree(menus)

    return build_system_menu_tree(all_menus)


def menu_to_system_item(menu: Menu) -> SystemMenuItem:
    """Convert a single Menu (with children eager-loaded) to a SystemMenuItem subtree."""
    children = sorted(menu.children, key=lambda x: (x.sort_order, x.id))
    return SystemMenuItem(
        id=menu.id,
        menuCode=menu.menu_code,
        parentId=menu.parent_id,
        type=menu.type,  # type: ignore[arg-type]
        title=menu.title,
        path=menu.path,
        componentPath=menu.component_path,
        icon=menu.icon,
        permissionCode=menu.permission_code,
        order=menu.sort_order,
        visible=menu.visible,
        enabled=menu.enabled,
        tagViewEnabled=menu.tag_view_enabled,
        keepAliveEnabled=menu.keep_alive_enabled,
        createdAt=menu.created_at.isoformat() if menu.created_at else None,
        updatedAt=menu.updated_at.isoformat() if menu.updated_at else None,
        children=[menu_to_system_item(child) for child in children],
    )


def build_menu_tree(menus: list[Menu]) -> list[MenuNode]:
    """Build an authorized menu tree (MenuNode) from a flat list of menus."""
    return _build_tree(menus, include_timestamps=False)  # type: ignore[return-value]


def build_system_menu_tree(menus: list[Menu]) -> list[SystemMenuItem]:
    """Build the management menu tree (SystemMenuItem) from a flat list of menus."""
    return _build_tree(menus, include_timestamps=True)  # type: ignore[return-value]


def _build_tree(menus: list[Menu], *, include_timestamps: bool) -> list[MenuNode] | list[SystemMenuItem]:
    by_id = {m.id: m for m in menus}
    children_map: dict[int, list[Menu]] = {}
    roots: list[Menu] = []
    for m in menus:
        if m.parent_id is not None and m.parent_id in by_id:
            children_map.setdefault(m.parent_id, []).append(m)
        elif m.type != "F":
            roots.append(m)

    for lst in children_map.values():
        lst.sort(key=lambda x: (x.sort_order, x.id))
    roots.sort(key=lambda x: (x.sort_order, x.id))

    def to_node(m: Menu) -> MenuNode | SystemMenuItem:
        kwargs = {
            "id": m.id,
            "menuCode": m.menu_code,
            "parentId": m.parent_id,
            "type": m.type,  # type: ignore[arg-type]
            "title": m.title,
            "path": m.path,
            "componentPath": m.component_path,
            "icon": m.icon,
            "permissionCode": m.permission_code,
            "order": m.sort_order,
            "visible": m.visible,
            "enabled": m.enabled,
            "tagViewEnabled": m.tag_view_enabled,
            "keepAliveEnabled": m.keep_alive_enabled,
            "children": [to_node(c) for c in children_map.get(m.id, [])],
        }
        if include_timestamps:
            return SystemMenuItem(
                **kwargs,  # type: ignore[arg-type]
                createdAt=m.created_at.isoformat() if m.created_at else None,
                updatedAt=m.updated_at.isoformat() if m.updated_at else None,
            )
        return MenuNode(**kwargs)

    return [to_node(m) for m in roots]
