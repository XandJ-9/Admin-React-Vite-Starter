"""Pytest configuration: isolate the database before the app is imported."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

# 在导入 app 之前设置隔离的 SQLite 数据库与密钥，避免污染本地 db/app.db。
_db_dir = Path(tempfile.mkdtemp(prefix="admin-test-"))
os.environ.setdefault("DATABASE_URL", f"sqlite:///{(_db_dir / 'test.db').as_posix()}")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production-please-use-32-plus-bytes")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("FEISHU_APP_ID", "")
os.environ.setdefault("FEISHU_APP_SECRET", "")

# 测试中关闭限流，避免用例触发速率限制。
from app.core.limiter import limiter  # noqa: E402

limiter.enabled = False
