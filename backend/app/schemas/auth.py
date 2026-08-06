"""Auth schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class UserRoleSummary(BaseModel):
    id: int
    code: str
    name: str


class CurrentUser(BaseModel):
    id: int
    username: str
    nickname: str
    avatar: str | None = None
    email: str | None = None
    phone: str | None = None
    roles: list[UserRoleSummary] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    isSuperAdmin: bool = False


class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str | None = None
    tokenType: str = "Bearer"
    expiresIn: int | None = None  # 单位：秒


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(TokenResponse):
    user: CurrentUser


class RefreshTokenRequest(BaseModel):
    refreshToken: str


class FeishuAuthUrlResponse(BaseModel):
    authUrl: str
    state: str


class FeishuLoginRequest(BaseModel):
    code: str
    state: str = ""


class FeishuLoginResponse(TokenResponse):
    user: CurrentUser
    isNewUser: bool = False


# 复用分页/排序基类供 query params
__all__ = [
    "CurrentUser",
    "FeishuAuthUrlResponse",
    "FeishuLoginRequest",
    "FeishuLoginResponse",
    "LoginRequest",
    "LoginResponse",
    "RefreshTokenRequest",
    "TokenResponse",
    "UserRoleSummary",
]
