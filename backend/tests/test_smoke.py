"""Smoke tests covering auth, RBAC and system management."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


def _flatten(nodes: list[dict]) -> list[dict]:
    result: list[dict] = []
    for node in nodes:
        result.append(node)
        result.extend(_flatten(node.get("children", [])))
    return result


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient, username: str = "admin", password: str = "admin123") -> dict:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_invalid_credentials(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID_CREDENTIALS"


def test_login_me_and_menus(client: TestClient) -> None:
    data = _login(client)
    token = data["accessToken"]
    assert data["tokenType"] == "Bearer"
    assert data["user"]["isSuperAdmin"] is True
    assert data["user"]["username"] == "admin"
    assert "system:user:create" in data["user"]["permissions"]

    me = client.get("/api/v1/auth/me", headers=_auth_header(token))
    assert me.status_code == 200
    assert me.json()["username"] == "admin"

    menus = client.get("/api/v1/auth/menus", headers=_auth_header(token))
    assert menus.status_code == 200
    m_nodes = [node for node in _flatten(menus.json()) if node["type"] == "M"]
    paths = {node["path"] for node in m_nodes}
    assert "/dashboard" in paths
    assert "/system/users" in paths
    assert "/system/roles" in paths
    assert "/system/menus" in paths


def test_refresh_token(client: TestClient) -> None:
    data = _login(client)
    refresh = client.post("/api/v1/auth/refresh", json={"refreshToken": data["refreshToken"]})
    assert refresh.status_code == 200
    assert refresh.json()["accessToken"]


def test_system_users_list_and_create(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth_header(token)

    listed = client.get("/api/v1/system/users?page=1&pageSize=20", headers=headers)
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["total"] >= 2
    assert isinstance(payload["items"], list)

    created = client.post(
        "/api/v1/system/users",
        json={
            "username": "tester",
            "nickname": "测试用户",
            "password": "pass1234",
            "status": "enabled",
            "roleIds": [],
        },
        headers=headers,
    )
    assert created.status_code == 200, created.text
    assert created.json()["username"] == "tester"

    duplicate = client.post(
        "/api/v1/system/users",
        json={
            "username": "tester",
            "nickname": "重复",
            "password": "pass1234",
            "status": "enabled",
            "roleIds": [],
        },
        headers=headers,
    )
    assert duplicate.status_code == 409


def test_roles_list_and_menus_tree(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth_header(token)

    roles = client.get("/api/v1/system/roles?page=1&pageSize=20", headers=headers)
    assert roles.status_code == 200
    codes = {role["code"] for role in roles.json()["items"]}
    assert {"super_admin", "operator"} <= codes

    menus = client.get("/api/v1/system/menus", headers=headers)
    assert menus.status_code == 200
    assert isinstance(menus.json(), list)
    assert len(menus.json()) >= 2  # 工作台 + 系统管理


def test_operator_has_no_write_permission(client: TestClient) -> None:
    token = _login(client, "operator", "operator123")["accessToken"]
    headers = _auth_header(token)

    # 普通操作员可以看到用户列表（菜单授权），但不能新增
    listed = client.get("/api/v1/system/users?page=1&pageSize=20", headers=headers)
    assert listed.status_code == 200

    created = client.post(
        "/api/v1/system/users",
        json={
            "username": "forbidden",
            "nickname": "禁止",
            "password": "pass1234",
            "status": "enabled",
            "roleIds": [],
        },
        headers=headers,
    )
    assert created.status_code == 403


def test_protected_endpoint_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
