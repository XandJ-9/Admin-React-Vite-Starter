"""Menu schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MenuType = Literal["C", "M", "F"]


class MenuNode(BaseModel):
    """Authorized menu node returned by /auth/menus."""

    id: int
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
    children: list[MenuNode] = Field(default_factory=list)


class SystemMenuItem(MenuNode):
    """Menu node for management endpoints; includes timestamps."""

    createdAt: str | None = None
    updatedAt: str | None = None
    children: list[SystemMenuItem] = Field(default_factory=list)


# Resolve the forward reference so child nodes keep their timestamps.
SystemMenuItem.model_rebuild()
