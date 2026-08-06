"""Application settings loaded from environment variables."""

from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("app.config")

DEFAULT_JWT_SECRET = "change-me-in-production-please-use-a-long-random-string"
MIN_JWT_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Admin Starter Backend"
    debug: bool = False

    database_url: str = "sqlite:///./db/app.db"

    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # 飞书 OAuth（可选）
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_redirect_uri: str = "http://localhost:5173/auth/feishu/callback"

    @field_validator("cors_origins", mode="after")
    @classmethod
    def _strip_cors(cls, value: str) -> str:
        return ",".join(origin.strip() for origin in value.split(",") if origin.strip())

    @model_validator(mode="after")
    def _validate_jwt_secret(self) -> Settings:
        """拒绝在生产环境使用默认/过短的 JWT 密钥。"""
        if self.jwt_secret == DEFAULT_JWT_SECRET:
            if not self.debug:
                raise ValueError(
                    "JWT_SECRET 仍为默认占位值；生产环境（DEBUG=false）必须设置一个独立的随机密钥。"
                )
            logger.warning("JWT_SECRET 使用默认占位值，仅限本地开发使用。")
        elif len(self.jwt_secret) < MIN_JWT_SECRET_LENGTH:
            if not self.debug:
                raise ValueError(f"JWT_SECRET 长度不足，生产环境至少需要 {MIN_JWT_SECRET_LENGTH} 字节。")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return self.cors_origins.split(",") if self.cors_origins else []

    @property
    def feishu_configured(self) -> bool:
        return bool(self.feishu_app_id and self.feishu_app_secret)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
