"""Auth endpoints: login, logout, me, menus, refresh, Feishu OAuth."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_active_user
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import (
    CurrentUser,
    FeishuAuthUrlResponse,
    FeishuLoginRequest,
    FeishuLoginResponse,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    TokenResponse,
)
from app.schemas.menu import MenuNode
from app.services import auth_service
from app.services.rbac import build_authorized_menu_tree, build_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, response: Response, payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    return auth_service.login(db, payload)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> Response:
    # 递增令牌版本，使该用户已签发的 access/refresh 令牌立即失效。
    auth_service.logout(db, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=CurrentUser)
def me(user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> CurrentUser:
    return build_current_user(db, user)


@router.get("/menus", response_model=list[MenuNode])
def menus(
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[MenuNode]:
    return build_authorized_menu_tree(db, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
def refresh(request: Request, response: Response, payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.refresh_tokens(db, payload.refreshToken)


@router.get("/feishu/auth-url", response_model=FeishuAuthUrlResponse)
def feishu_auth_url() -> FeishuAuthUrlResponse:
    return auth_service.get_feishu_auth_url()


@router.post("/feishu/login", response_model=FeishuLoginResponse)
@limiter.limit("10/minute")
def feishu_login(
    request: Request,
    response: Response,
    payload: FeishuLoginRequest,
    db: Session = Depends(get_db),
) -> FeishuLoginResponse:
    return auth_service.feishu_login(db, payload.code, payload.state)
