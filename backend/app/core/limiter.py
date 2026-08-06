"""Shared rate limiter (slowapi) keyed by client IP."""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# 单进程内存计数；多进程部署需替换为 Redis 后端（见 slowapi 文档）。
limiter = Limiter(key_func=get_remote_address, headers_enabled=True)
