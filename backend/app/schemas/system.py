"""System management schemas (users, roles, menus)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import KeywordQuery, PageQuery, SortQuery
from app.schemas.menu import MenuType

StatusFlag = Literal["enabled", "disabled"]


# ── 用户 ────────────────────────────────────────────────────────────────────
class UserItem(BaseModel):
    id: int
    username: str
    nickname: str
    email: str | None = None
    phone: str | None = None
    avatar: str | None = None
    status: StatusFlag
    roleIds: list[int] = Field(default_factory=list)
    roleNames: list[str] = Field(default_factory=list)
    lastLoginAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class UserCreateRequest(BaseModel):
    username: str
    nickname: str
    password: str
    email: str | None = None
    phone: str | None = None
    status: StatusFlag = "enabled"
    roleIds: list[int] = Field(default_factory=list)


class UserUpdateRequest(BaseModel):
    nickname: str
    email: str | None = None
    phone: str | None = None
    status: StatusFlag = "enabled"
    roleIds: list[int] = Field(default_factory=list)


class UserQueryParams(PageQuery, SortQuery, KeywordQuery):
    status: StatusFlag | None = None
    roleId: int | None = None


# ── 角色 ────────────────────────────────────────────────────────────────────
class RoleItem(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    status: StatusFlag
    menuIds: list[int] = Field(default_factory=list)
    createdAt: str | None = None
    updatedAt: str | None = None


class RoleCreateRequest(BaseModel):
    code: str
    name: str
    description: str | None = None
    status: StatusFlag = "enabled"


class RoleUpdateRequest(RoleCreateRequest):
    pass


class RoleMenuAssignment(BaseModel):
    roleId: int
    menuIds: list[int] = Field(default_factory=list)


class RoleQueryParams(PageQuery, SortQuery, KeywordQuery):
    status: StatusFlag | None = None


# ── 菜单 ────────────────────────────────────────────────────────────────────
class MenuCreateRequest(BaseModel):
    menuCode: str
    parentId: int | None = None
    type: MenuType
    title: str
    path: str | None = None
    componentPath: str | None = None
    icon: str | None = None
    permissionCode: str | None = None
    order: int = 0
    visible: bool = True
    enabled: bool = True
    tagViewEnabled: bool = True
    keepAliveEnabled: bool = False


class MenuUpdateRequest(MenuCreateRequest):
    pass


class MenuQueryParams(KeywordQuery):
    type: MenuType | None = None
    enabled: bool | None = None
    visible: bool | None = None
