"""Extended tests: CRUD, RBAC fixes, validation, and edge cases."""

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


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _menus(client: TestClient, token: str) -> list[dict]:
    response = client.get("/api/v1/system/menus", headers=_auth(token))
    assert response.status_code == 200, response.text
    return response.json()


def _menu_id_by_code(client: TestClient, token: str, code: str) -> int:
    for node in _flatten(_menus(client, token)):
        if node["menuCode"] == code:
            return node["id"]
    raise AssertionError(f"menu {code} not found")


def _menu_id_by_permission(client: TestClient, token: str, perm: str) -> int:
    for node in _flatten(_menus(client, token)):
        if node.get("permissionCode") == perm:
            return node["id"]
    raise AssertionError(f"menu with permission {perm} not found")


# ── 认证与令牌 ────────────────────────────────────────────────────────────────
def test_validation_error_envelope(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["traceId"]
    assert isinstance(body["fields"], list)


def test_invalid_bearer_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert response.status_code == 401


def test_logout_invalidates_access_token(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    logout = client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 204

    # 令牌版本已递增，旧 access token 应立即失效。
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 401


def test_feishu_auth_url_not_configured(client: TestClient) -> None:
    response = client.get("/api/v1/auth/feishu/auth-url")
    assert response.status_code == 503
    assert response.json()["code"] == "FEISHU_NOT_CONFIGURED"


# ── 用户管理 ──────────────────────────────────────────────────────────────────
def test_user_crud_and_duplicate(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    created = client.post(
        "/api/v1/system/users",
        json={"username": "crud_user", "nickname": "CRUD", "password": "pass1234", "status": "enabled", "roleIds": []},
        headers=headers,
    )
    assert created.status_code == 200, created.text
    user_id = created.json()["id"]

    dup = client.post(
        "/api/v1/system/users",
        json={"username": "crud_user", "nickname": "dup", "password": "pass1234", "status": "enabled", "roleIds": []},
        headers=headers,
    )
    assert dup.status_code == 409

    updated = client.put(
        f"/api/v1/system/users/{user_id}",
        json={"nickname": "CRUD2", "email": "crud@example.com", "status": "enabled", "roleIds": []},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["nickname"] == "CRUD2"

    deleted = client.delete(f"/api/v1/system/users/{user_id}", headers=headers)
    assert deleted.status_code == 204


def test_admin_cannot_disable_self(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)
    me = client.get("/api/v1/auth/me", headers=headers).json()

    response = client.put(
        f"/api/v1/system/users/{me['id']}",
        json={"nickname": me["nickname"], "status": "disabled", "roleIds": []},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["code"] == "USER_DISABLE_SELF"


def test_last_super_admin_protection(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)
    me = client.get("/api/v1/auth/me", headers=headers).json()

    # admin 是唯一的启用超管，移除自己的 super_admin 角色应被拒绝。
    response = client.put(
        f"/api/v1/system/users/{me['id']}",
        json={"nickname": me["nickname"], "status": "enabled", "roleIds": []},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["code"] == "LAST_SUPER_ADMIN"


# ── H1: 非超管不能提权 ─────────────────────────────────────────────────────────
def test_non_super_admin_cannot_promote_to_super_admin(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    # 准备一个仅持 system:user:update 的角色与用户
    f_id = _menu_id_by_permission(client, token, "system:user:update")
    role = client.post(
        "/api/v1/system/roles",
        json={"code": "user_mgr_test", "name": "用户管理员(测试)", "status": "enabled"},
        headers=headers,
    )
    assert role.status_code == 200, role.text
    role_id = role.json()["id"]
    client.post(
        "/api/v1/system/roles/menus",
        json={"roleId": role_id, "menuIds": [f_id]},
        headers=headers,
    )

    mgr = client.post(
        "/api/v1/system/users",
        json={"username": "mgr_test", "nickname": "Mgr", "password": "mgr12345", "status": "enabled", "roleIds": [role_id]},
        headers=headers,
    )
    assert mgr.status_code == 200, mgr.text
    mgr_id = mgr.json()["id"]

    mgr_token = _login(client, "mgr_test", "mgr12345")["accessToken"]
    mgr_headers = _auth(mgr_token)

    super_role_id = next(r["id"] for r in client.get("/api/v1/system/roles?page=1&pageSize=100", headers=headers).json()["items"] if r["code"] == "super_admin")
    op_id = next(u["id"] for u in client.get("/api/v1/system/users?page=1&pageSize=100", headers=headers).json()["items"] if u["username"] == "operator")

    # mgr 试图把 operator 提升为 super_admin -> 403
    response = client.put(
        f"/api/v1/system/users/{op_id}",
        json={"nickname": "操作员", "status": "enabled", "roleIds": [super_role_id]},
        headers=mgr_headers,
    )
    assert response.status_code == 403
    assert response.json()["code"] == "ROLE_SUPER_ADMIN_LOCKED"

    # 清理
    client.delete(f"/api/v1/system/users/{mgr_id}", headers=headers)
    client.delete(f"/api/v1/system/roles/{role_id}", headers=headers)


# ── 角色管理 ──────────────────────────────────────────────────────────────────
def test_role_update_rules(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    role = client.post(
        "/api/v1/system/roles",
        json={"code": "role_test_a", "name": "A", "status": "enabled"},
        headers=headers,
    )
    assert role.status_code == 200, role.text
    role_id = role.json()["id"]

    # 不能把角色编码改为 super_admin
    to_super = client.put(
        f"/api/v1/system/roles/{role_id}",
        json={"code": "super_admin", "name": "A", "status": "enabled"},
        headers=headers,
    )
    assert to_super.status_code == 400
    assert to_super.json()["code"] == "ROLE_SUPER_ADMIN_LOCKED"

    # 创建第二个角色，用它的编码做重复检查
    role2 = client.post(
        "/api/v1/system/roles",
        json={"code": "role_test_b", "name": "B", "status": "enabled"},
        headers=headers,
    )
    assert role2.status_code == 200
    role2_id = role2.json()["id"]

    dup = client.put(
        f"/api/v1/system/roles/{role2_id}",
        json={"code": "role_test_a", "name": "B", "status": "enabled"},
        headers=headers,
    )
    assert dup.status_code == 409
    assert dup.json()["code"] == "ROLE_CODE_DUPLICATE"

    client.delete(f"/api/v1/system/roles/{role2_id}", headers=headers)
    client.delete(f"/api/v1/system/roles/{role_id}", headers=headers)


def test_cannot_delete_super_admin_role(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)
    super_role_id = next(r["id"] for r in client.get("/api/v1/system/roles?page=1&pageSize=100", headers=headers).json()["items"] if r["code"] == "super_admin")

    response = client.delete(f"/api/v1/system/roles/{super_role_id}", headers=headers)
    assert response.status_code == 400


# ── M2: 角色授权范围 ───────────────────────────────────────────────────────────
def test_role_mgr_cannot_assign_unauthorized_menu(client: TestClient) -> None:
    admin_token = _login(client)["accessToken"]
    admin_headers = _auth(admin_token)

    # role_mgr 仅持 system:role:menus 一个 F 节点：有授权权限，但不持有 system:user:create
    role_mgr_perm_id = _menu_id_by_permission(client, admin_token, "system:role:menus")
    target_f_id = _menu_id_by_permission(client, admin_token, "system:user:create")

    role = client.post(
        "/api/v1/system/roles",
        json={"code": "role_mgr_test", "name": "角色管理员(测试)", "status": "enabled"},
        headers=admin_headers,
    )
    assert role.status_code == 200, role.text
    role_id = role.json()["id"]
    client.post("/api/v1/system/roles/menus", json={"roleId": role_id, "menuIds": [role_mgr_perm_id]}, headers=admin_headers)

    mgr = client.post(
        "/api/v1/system/users",
        json={"username": "role_mgr_user", "nickname": "RoleMgr", "password": "rmgr12345", "status": "enabled", "roleIds": [role_id]},
        headers=admin_headers,
    )
    assert mgr.status_code == 200, mgr.text
    mgr_id = mgr.json()["id"]

    mgr_token = _login(client, "role_mgr_user", "rmgr12345")["accessToken"]
    operator_role_id = next(r["id"] for r in client.get("/api/v1/system/roles?page=1&pageSize=100", headers=admin_headers).json()["items"] if r["code"] == "operator")

    # role_mgr 试图把 system:user:create（自己没有的菜单）授权给 operator -> 403
    response = client.post(
        "/api/v1/system/roles/menus",
        json={"roleId": operator_role_id, "menuIds": [target_f_id]},
        headers=_auth(mgr_token),
    )
    assert response.status_code == 403

    # 清理
    client.delete(f"/api/v1/system/users/{mgr_id}", headers=admin_headers)
    client.delete(f"/api/v1/system/roles/{role_id}", headers=admin_headers)


# ── 菜单管理 ──────────────────────────────────────────────────────────────────
def test_menu_crud(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    created = client.post(
        "/api/v1/system/menus",
        json={"menuCode": "menu.test.advanced", "type": "C", "title": "测试目录", "order": 99, "visible": True, "enabled": True},
        headers=headers,
    )
    assert created.status_code == 200, created.text
    menu = created.json()
    assert menu["menuCode"] == "menu.test.advanced"
    assert menu["id"]

    updated = client.put(
        f"/api/v1/system/menus/{menu['id']}",
        json={"menuCode": "menu.test.advanced", "type": "C", "title": "测试目录改名", "order": 99, "visible": True, "enabled": True},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "测试目录改名"

    deleted = client.delete(f"/api/v1/system/menus/{menu['id']}", headers=headers)
    assert deleted.status_code == 204


def test_menu_parent_not_found(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)
    response = client.post(
        "/api/v1/system/menus",
        json={"menuCode": "menu.test.orphan", "parentId": 999999, "type": "M", "title": "孤儿", "path": "/orphan", "componentPath": "x/XPage", "order": 1, "visible": True, "enabled": True},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["code"] == "MENU_PARENT_NOT_FOUND"


def test_menu_delete_with_children_forbidden(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    parent = client.post(
        "/api/v1/system/menus",
        json={"menuCode": "menu.test.parent", "type": "C", "title": "父", "order": 99, "visible": True, "enabled": True},
        headers=headers,
    )
    parent_id = parent.json()["id"]
    child = client.post(
        "/api/v1/system/menus",
        json={"menuCode": "menu.test.child", "parentId": parent_id, "type": "M", "title": "子", "path": "/test/child", "componentPath": "x/XPage", "order": 1, "visible": True, "enabled": True},
        headers=headers,
    )
    child_id = child.json()["id"]

    # 父菜单有子菜单，不能删除
    response = client.delete(f"/api/v1/system/menus/{parent_id}", headers=headers)
    assert response.status_code == 400
    assert response.json()["code"] == "MENU_HAS_CHILDREN"

    # 清理：先删子，再删父
    client.delete(f"/api/v1/system/menus/{child_id}", headers=headers)
    client.delete(f"/api/v1/system/menus/{parent_id}", headers=headers)


# ── 分页与排序 ─────────────────────────────────────────────────────────────────
def test_users_sort_and_pagination(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)

    asc = client.get("/api/v1/system/users?page=1&pageSize=2&sortBy=username&sortOrder=ascend", headers=headers)
    assert asc.status_code == 200
    asc_body = asc.json()
    assert asc_body["pageSize"] == 2
    assert len(asc_body["items"]) <= 2
    usernames = [u["username"] for u in asc_body["items"]]
    assert usernames == sorted(usernames)

    desc = client.get("/api/v1/system/users?page=1&pageSize=2&sortBy=username&sortOrder=descend", headers=headers)
    desc_names = [u["username"] for u in desc.json()["items"]]
    assert desc_names == sorted(desc_names, reverse=True)

    # 非法 sortOrder 应被 422 拒绝
    bad = client.get("/api/v1/system/users?sortOrder=desc", headers=headers)
    assert bad.status_code == 422


def test_menus_type_filter_returns_tree(client: TestClient) -> None:
    token = _login(client)["accessToken"]
    headers = _auth(token)
    # type=F 过滤应返回包含祖先链的树（修复 type=F 返回空树）
    response = client.get("/api/v1/system/menus?type=F", headers=headers)
    assert response.status_code == 200
    tree = response.json()
    flat = _flatten(tree)
    assert any(node["type"] == "F" for node in flat)
    # F 节点的祖先 C/M 也应在树中
    assert any(node["type"] == "M" for node in flat)
