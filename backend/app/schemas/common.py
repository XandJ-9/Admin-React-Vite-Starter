"""Common schemas shared across modules."""

from __future__ import annotations

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageResult(BaseModel, Generic[T]):
    """Paginated list response matching the frontend PageResult<T>."""

    items: list[T]
    total: int
    page: int
    pageSize: int


class PageQuery(BaseModel):
    page: int = 1
    pageSize: int = 20


class SortQuery(BaseModel):
    sortBy: str | None = None
    sortOrder: Literal["ascend", "descend"] | None = None


class KeywordQuery(BaseModel):
    keyword: str | None = None
