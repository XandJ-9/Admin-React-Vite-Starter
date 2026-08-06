"""Schemas (Pydantic v2). Field names use camelCase to match the frontend contract."""

from app.schemas.auth import (
    CurrentUser,
    FeishuAuthUrlResponse,
    FeishuLoginRequest,
    FeishuLoginResponse,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserRoleSummary,
)
from app.schemas.common import PageResult
from app.schemas.menu import MenuNode, SystemMenuItem
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

__all__ = [
    "CurrentUser",
    "FeishuAuthUrlResponse",
    "FeishuLoginRequest",
    "FeishuLoginResponse",
    "LoginRequest",
    "LoginResponse",
    "MenuCreateRequest",
    "MenuNode",
    "MenuQueryParams",
    "MenuUpdateRequest",
    "PageResult",
    "RefreshTokenRequest",
    "RoleCreateRequest",
    "RoleItem",
    "RoleMenuAssignment",
    "RoleQueryParams",
    "RoleUpdateRequest",
    "SystemMenuItem",
    "TokenResponse",
    "UserCreateRequest",
    "UserItem",
    "UserQueryParams",
    "UserRoleSummary",
    "UserUpdateRequest",
]
