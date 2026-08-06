"""Menu ORM model (C/M/F authorization tree)."""

from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import IdMixin, TimestampMixin


class Menu(Base, IdMixin, TimestampMixin):
    __tablename__ = "menus"

    menu_code: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("menus.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(1))  # C / M / F
    title: Mapped[str] = mapped_column(String(64))
    path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    component_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    permission_code: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    tag_view_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    keep_alive_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    parent: Mapped[Menu | None] = relationship(
        "Menu",
        remote_side="Menu.id",
        back_populates="children",
    )
    children: Mapped[list[Menu]] = relationship(
        "Menu",
        back_populates="parent",
        order_by="Menu.sort_order",
        lazy="selectin",
    )
