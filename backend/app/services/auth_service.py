"""Authentication: login, refresh, Feishu OAuth."""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.crud.role import get_role_by_code
from app.crud.user import (
    bump_token_version,
    get_user,
    get_user_by_feishu_open_id,
    get_user_by_username,
    update_last_login,
)
from app.models.user import User
from app.schemas.auth import (
    FeishuAuthUrlResponse,
    FeishuLoginResponse,
    LoginRequest,
    LoginResponse,
    TokenResponse,
)
from app.services.rbac import build_current_user

logger = logging.getLogger("app.auth")

FEISHU_BASE_URL = "https://open.feishu.cn"
DEFAULT_FEISHU_ROLE_CODE = "operator"
FEISHU_STATE_TTL_SECONDS = 600

# 预计算的虚拟哈希，用于用户名不存在时拉平 bcrypt 校验耗时，避免用户名枚举时序侧信道。
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing-equalization")


def _token_pair(user: User) -> tuple[str, str, int]:
    access = create_access_token(user.id, user.token_version)
    refresh = create_refresh_token(user.id, user.token_version)
    expires_in = settings.access_token_expire_minutes * 60
    return access, refresh, expires_in


def authenticate(db: Session, username: str, password: str) -> User:
    user = get_user_by_username(db, username)
    if user is None:
        # 用户不存在时也跑一次 bcrypt，使响应时长与密码错误的情况一致。
        verify_password(password, _DUMMY_PASSWORD_HASH)
        raise AppException("用户名或密码错误", code="AUTH_INVALID_CREDENTIALS", status_code=401)
    if not verify_password(password, user.password_hash):
        raise AppException("用户名或密码错误", code="AUTH_INVALID_CREDENTIALS", status_code=401)
    if user.status != "enabled":
        raise AppException("账号已禁用", code="ACCOUNT_DISABLED", status_code=403)
    return user


def login(db: Session, payload: LoginRequest) -> LoginResponse:
    user = authenticate(db, payload.username, payload.password)
    update_last_login(db, user)
    access, refresh, expires_in = _token_pair(user)
    return LoginResponse(
        accessToken=access,
        refreshToken=refresh,
        tokenType="Bearer",
        expiresIn=expires_in,
        user=build_current_user(db, user),
    )


def logout(db: Session, user: User) -> None:
    """递增令牌版本，使该用户已签发的所有 access/refresh 令牌立即失效。"""
    bump_token_version(db, user)


def refresh_tokens(db: Session, refresh_token: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token)
    except InvalidTokenError as exc:
        raise AppException("刷新令牌无效", code="INVALID_REFRESH_TOKEN", status_code=401) from exc
    if payload.get("type") != "refresh":
        raise AppException("刷新令牌无效", code="INVALID_REFRESH_TOKEN", status_code=401)
    user_id = payload.get("sub")
    if not user_id:
        raise AppException("刷新令牌无效", code="INVALID_REFRESH_TOKEN", status_code=401)
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError) as exc:
        raise AppException("刷新令牌无效", code="INVALID_REFRESH_TOKEN", status_code=401) from exc
    user = get_user(db, user_id_int)
    if user is None or user.status != "enabled":
        raise AppException("账号不可用", code="ACCOUNT_DISABLED", status_code=403)
    # 令牌版本校验：logout / 改密后旧刷新令牌立即失效。
    if payload.get("ver") != user.token_version:
        raise AppException("刷新令牌已失效，请重新登录", code="INVALID_REFRESH_TOKEN", status_code=401)
    access, new_refresh, expires_in = _token_pair(user)
    return TokenResponse(
        accessToken=access,
        refreshToken=new_refresh,
        tokenType="Bearer",
        expiresIn=expires_in,
    )


# ── 飞书 OAuth ────────────────────────────────────────────────────────────────
def _create_feishu_state() -> str:
    now = datetime.now(UTC)
    payload = {
        "type": "feishu_state",
        "nonce": secrets.token_hex(8),
        "iat": now,
        "exp": now + timedelta(seconds=FEISHU_STATE_TTL_SECONDS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _verify_feishu_state(state: str) -> bool:
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return False
    return payload.get("type") == "feishu_state"


def get_feishu_auth_url() -> FeishuAuthUrlResponse:
    if not settings.feishu_configured:
        raise AppException("飞书登录未配置", code="FEISHU_NOT_CONFIGURED", status_code=503)
    state = _create_feishu_state()
    params = {
        "app_id": settings.feishu_app_id,
        "redirect_uri": settings.feishu_redirect_uri,
        "response_type": "code",
        "state": state,
    }
    auth_url = f"{FEISHU_BASE_URL}/open-apis/authen/v1/authorize?{urlencode(params)}"
    return FeishuAuthUrlResponse(authUrl=auth_url, state=state)


def feishu_login(db: Session, code: str, state: str) -> FeishuLoginResponse:
    if not settings.feishu_configured:
        raise AppException("飞书登录未配置", code="FEISHU_NOT_CONFIGURED", status_code=503)
    if not _verify_feishu_state(state):
        raise AppException("飞书登录状态校验失败，请重新登录", code="FEISHU_INVALID_STATE", status_code=400)
    app_token = _feishu_app_access_token()
    user_info = _feishu_user_info(app_token, code)
    open_id = user_info.get("open_id") or user_info.get("openId")
    if not open_id:
        raise AppException("飞书登录失败：未获取到用户标识", code="FEISHU_NO_OPENID", status_code=502)

    user = get_user_by_feishu_open_id(db, open_id)
    is_new_user = False
    if user is None:
        user = _create_feishu_user(db, user_info, open_id)
        is_new_user = True
    update_last_login(db, user)
    access, refresh, expires_in = _token_pair(user)
    return FeishuLoginResponse(
        accessToken=access,
        refreshToken=refresh,
        tokenType="Bearer",
        expiresIn=expires_in,
        user=build_current_user(db, user),
        isNewUser=is_new_user,
    )


def _feishu_app_access_token() -> str:
    url = f"{FEISHU_BASE_URL}/open-apis/auth/v3/app_access_token/internal"
    body = {"app_id": settings.feishu_app_id, "app_secret": settings.feishu_app_secret}
    try:
        response = httpx.post(url, json=body, timeout=10.0)
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AppException("飞书服务调用失败", code="FEISHU_REQUEST_FAILED", status_code=502) from exc
    token = data.get("app_access_token")
    if not token:
        logger.warning("Feishu app_access_token failed: %s", data)
        raise AppException("飞书登录失败，请稍后重试", code="FEISHU_TOKEN_FAILED", status_code=502)
    return token


def _feishu_user_info(app_token: str, code: str) -> dict:
    url = f"{FEISHU_BASE_URL}/open-apis/authen/v1/access_token"
    headers = {"Authorization": f"Bearer {app_token}"}
    body = {"grant_type": "authorization_code", "code": code}
    try:
        response = httpx.post(url, json=body, headers=headers, timeout=10.0)
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AppException("飞书服务调用失败", code="FEISHU_REQUEST_FAILED", status_code=502) from exc
    if data.get("code") not in (0, None):
        logger.warning("Feishu user info failed: %s", data)
        raise AppException("飞书登录失败，请稍后重试", code="FEISHU_USER_FAILED", status_code=502)
    return data.get("data") or data


def _create_feishu_user(db: Session, user_info: dict, open_id: str) -> User:
    name = user_info.get("name") or user_info.get("user_id") or f"飞书用户{open_id[:6]}"
    user = User(
        username=f"feishu_{open_id[:12]}",
        nickname=name,
        # OAuth 用户不设可用密码：随机不可验证，阻止通过 /auth/login 密码登录。
        password_hash=hash_password(secrets.token_urlsafe(32)),
        email=user_info.get("email"),
        avatar=user_info.get("avatar"),
        status="enabled",
        feishu_open_id=open_id,
    )
    default_role = get_role_by_code(db, DEFAULT_FEISHU_ROLE_CODE)
    if default_role:
        user.roles = [default_role]
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
