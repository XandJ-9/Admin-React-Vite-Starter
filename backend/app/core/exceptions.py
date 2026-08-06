"""Application exceptions and unified error handlers.

The frontend ``httpClient`` reads ``responseData.message ?? detail ?? error`` and
optionally ``code`` / ``traceId``. We therefore return a consistent envelope:
``{"message": ..., "code": ..., "traceId": ...}``.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.exceptions")


class AppException(Exception):
    """Domain exception rendered as a JSON error envelope."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "APP_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


def _trace_id() -> str:
    return uuid.uuid4().hex


def _envelope(message: str, code: str, trace_id: str, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"message": message, "code": code, "traceId": trace_id}
    if extra:
        payload.update(extra)
    return payload


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    trace_id = _trace_id()
    logger.warning("AppException %s [path=%s]: %s", exc.code, request.url.path, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(exc.message, exc.code, trace_id, details=exc.details),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    trace_id = _trace_id()
    logger.info("Validation error [path=%s]: %s", request.url.path, exc.errors())
    fields = [
        {"field": ".".join(str(part) for part in err["loc"][1:]), "message": err["msg"]}
        for err in exc.errors()
        if err.get("loc")
    ]
    message = "请求参数校验失败"
    if fields:
        message = "；".join(f"{f['field']}: {f['message']}" for f in fields)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_envelope(message, "VALIDATION_ERROR", trace_id, fields=fields),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    trace_id = _trace_id()
    logger.exception("Unhandled exception [path=%s, traceId=%s]", request.url.path, trace_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_envelope("服务器内部错误", "INTERNAL_ERROR", trace_id),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
