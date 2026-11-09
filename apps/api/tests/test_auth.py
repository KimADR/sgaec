from io import BytesIO
from zipfile import ZipFile

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main


USER = {
    "id": "test-user-id",
    "username": "agent",
    "roles": ["AGENT_SAISIE"],
    "permissions": ["births:workflow"],
    "communes": [{
        "id": "commune-a",
        "code": "COMMUNE_A",
        "name": "Commune A",
        "centres": [],
        "roles": ["AGENT_SAISIE"],
        "permissions": ["births:workflow"],
    }],
}


def user_with_permissions(permissions):
    return USER | {
        "permissions": permissions,
        "communes": [
            commune | {"permissions": permissions}
            for commune in USER["communes"]
        ],
    }


def test_api_requires_login_and_uses_database_user_jwt_cookie(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        assert method == "POST"
        assert path == "/auth/login"
        if json != {"username": "agent", "password": "correct-password"}:
            raise HTTPException(status_code=401, detail="Identifiant ou mot de passe invalide")
        return USER

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/dashboard").status_code == 401
        assert client.post("/api/v1/auth/login", json={
            "username": "agent",
            "password": "wrong-password",
        }).status_code == 401

        response = client.post("/api/v1/auth/login", json={
            "username": "agent",
            "password": "correct-password",
        })
        assert response.status_code == 200
        assert response.json()["username"] == "agent"
        assert response.json()["communes"] == USER["communes"]
        cookie = response.headers["set-cookie"].lower()
        assert "httponly" in cookie
        assert "samesite=strict" in cookie
        assert "path=/backend/api/v1" in cookie
        access_cookie = response.headers["set-cookie"].split(";", 1)[0]

        me = client.get("/api/v1/auth/me", headers={"Cookie": access_cookie})
        assert me.json() == {
            "id": "test-user-id",
            "username": "agent",
            "roles": ["AGENT_SAISIE"],
            "permissions": ["births:workflow"],
            "communes": USER["communes"],
            "current_commune_id": "commune-a",
        }
        assert client.post(
            "/api/v1/auth/logout",
            headers={"Cookie": access_cookie},
        ).status_code == 403
        assert client.post(
            "/api/v1/auth/logout",
            headers={
                "Cookie": access_cookie,
                "X-SGAEC-Request": "1",
                "Origin": "http://localhost:3000",
            },
        ).status_code == 200


def test_birth_workflow_role_can_call_transition_without_delivery_permission(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        assert method == "POST"
        assert path.endswith("/transition")
        return {"id": path.split("/")[-2], "status": json["status"]}

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        token = main.create_access_token(USER, client.app.state.auth)
        response = client.post(
            "/api/v1/births/00000000-0000-4000-8000-000000000001/transition",
            json={"status": "IN_REVIEW"},
            headers={
                "Cookie": f"sgaec_access_token={token}",
                "X-SGAEC-Request": "1",
                "Origin": "http://localhost:3000",
            },
        )
    assert response.status_code == 200
    assert response.json()["status"] == "IN_REVIEW"


def test_citizen_mutations_require_manage_permission(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path))
        return {"id": path.rsplit("/", 1)[-1], "active": True}

    monkeypatch.setattr(main, "forward", fake_forward)
    citizen_id = "00000000-0000-4000-8000-000000000001"
    citizen = {
        "last_name": "CITOYEN-FICTIF",
        "first_names": "Aina",
        "sex": "F",
        "birth_date": "2004-07-09",
        "nationality": "Malagasy",
        "birth_place": "Commune fictive A",
    }

    with TestClient(main.app) as client:
        reader = main.create_access_token(
            user_with_permissions(["citizens:read"]), client.app.state.auth,
        )
        headers = {"Cookie": f"sgaec_access_token={reader}"}
        assert client.get("/api/v1/citizens?q=Aina", headers=headers).status_code == 200
        denied = client.post(
            "/api/v1/citizens",
            json=citizen,
            headers=headers | {
                "X-SGAEC-Request": "1",
                "Origin": "http://localhost:3000",
            },
        )
        assert denied.status_code == 403
        assert forwarded == [("GET", "/citizens")]

        manager = main.create_access_token(
            user_with_permissions(["citizens:read", "citizens:manage"]),
            client.app.state.auth,
        )
        manager_headers = {
            "Cookie": f"sgaec_access_token={manager}",
            "X-SGAEC-Request": "1",
            "Origin": "http://localhost:3000",
        }
        assert client.post("/api/v1/citizens", json=citizen, headers=manager_headers).status_code == 201
        assert client.put(
            f"/api/v1/citizens/{citizen_id}",
            json=citizen,
            headers=manager_headers,
        ).status_code == 200
        assert client.delete(
            f"/api/v1/citizens/{citizen_id}",
            headers=manager_headers,
        ).status_code == 200
    assert forwarded == [
        ("GET", "/citizens"),
        ("POST", "/citizens"),
        ("PUT", f"/citizens/{citizen_id}"),
        ("DELETE", f"/citizens/{citizen_id}"),
    ]


def test_paginated_requests_forward_filters_and_require_a_read_permission(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path, params, tenant.state.user["commune_id"]))
        return {
            "items": [],
            "total": 101,
            "page": params["page"],
            "page_size": params["page_size"],
            "total_pages": 6,
        }

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        reader = main.create_access_token(
            user_with_permissions(["births:read"]), client.app.state.auth,
        )
        response = client.get(
            "/api/v1/requests?q=Aina&type=births&status=VALIDATED&scope=active&page=5&page_size=20",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        )

        assert response.status_code == 200
        assert response.json()["total"] == 101
        denied = client.get(
            "/api/v1/requests",
            headers={
                "Cookie": f"sgaec_access_token={main.create_access_token(USER, client.app.state.auth)}",
            },
        )
        assert denied.status_code == 403

    assert forwarded == [(
        "GET",
        "/requests",
        {"q": "Aina", "type": "births", "scope": "active", "status": "VALIDATED", "page": 5, "page_size": 20},
        "commune-a",
    )]


def test_reports_forward_date_range_and_require_dashboard_permission(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path, params, tenant.state.user["commune_id"]))
        return {
            "start_date": params["start_date"],
            "end_date": params["end_date"],
            "total": 0,
            "by_type": [],
            "by_status": [],
        }

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        reader = main.create_access_token(
            user_with_permissions(["dashboard:read"]), client.app.state.auth,
        )
        response = client.get(
            "/api/v1/reports?start_date=2026-11-01&end_date=2026-11-30",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0
        assert client.get(
            "/api/v1/reports?start_date=2026-11-01&end_date=2026-11-30",
            headers={"Cookie": f"sgaec_access_token={main.create_access_token(USER, client.app.state.auth)}"},
        ).status_code == 403
        assert client.get(
            "/api/v1/reports?start_date=2026-12-01&end_date=2026-11-30",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        ).status_code == 422
        assert client.get(
            "/api/v1/reports?start_date=2026-01-01&end_date=2027-01-02",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        ).status_code == 422

    assert forwarded == [(
        "GET",
        "/reports",
        {"start_date": "2026-11-01", "end_date": "2026-11-30"},
        "commune-a",
    )]


def test_bulk_specimen_export_is_permission_checked_and_returns_both_pdf_types(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []
    export_data = {
        "commune": {"id": "commune-a", "code": "COMMUNE_A", "name": "Commune A"},
        "export_id": "test-export",
        "births": [{
            "id": "birth-id",
            "record_number": "NAI-DEMO-0001",
            "last_name": "CITOYEN-FICTIF",
            "first_names": "Aina",
            "sex": "F",
            "birth_date": "2004-07-09",
            "nationality": "Malagasy",
            "district": "Arrondissement fictif",
            "municipality": "Commune A",
            "place_of_birth": "Commune A",
            "father_name": "",
            "mother_name": "",
            "address": "",
            "declarant_name": "",
        }],
        "cin": [{
            "id": "cin-id",
            "file_number": "CIN-DEMO-0001",
            "last_name": "CITOYEN-FICTIF",
            "first_names": "Aina",
            "birth_date": "2004-07-09",
            "birth_place": "Commune A",
            "address": "Adresse fictive",
            "district": "Arrondissement fictif",
            "profession": "",
            "father_name": "",
            "mother_name": "",
            "has_birth_certificate": True,
            "has_residence_proof": False,
            "photos_count": 0,
            "status": "REGISTERED",
            "commune": {"id": "commune-a", "name": "Commune A"},
            "centre": {"id": "centre-a", "name": "Centre A"},
        }],
    }

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path, params))
        return export_data

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        reader = main.create_access_token(
            user_with_permissions(["births:read", "cin:read"]),
            client.app.state.auth,
        )
        denied = client.get(
            "/api/v1/documents/export.zip",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        )
        assert denied.status_code == 403
        assert forwarded == []

        exporter = main.create_access_token(
            user_with_permissions(["births:read", "cin:read", "documents:preview"]),
            client.app.state.auth,
        )
        response = client.get(
            "/api/v1/documents/export.zip",
            headers={"Cookie": f"sgaec_access_token={exporter}"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "attachment;" in response.headers["content-disposition"]
    assert forwarded == [("GET", "/documents/export", {"type": "all"})]
    with ZipFile(BytesIO(response.content)) as archive:
        pdfs = [name for name in archive.namelist() if name.endswith(".pdf")]
        assert pdfs == ["naissances/NAI-DEMO-0001.pdf", "cin/CIN-DEMO-0001.pdf"]


def test_individual_cin_specimen_requires_preview_permission(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []
    cin_record = {
        "id": "cin-id",
        "file_number": "CIN-DEMO-0001",
        "last_name": "CITOYEN-FICTIF",
        "first_names": "Aina",
        "birth_date": "2004-07-09",
        "birth_place": "Commune A",
        "address": "Adresse fictive",
        "district": "Arrondissement fictif",
        "profession": "",
        "father_name": "",
        "mother_name": "",
        "has_birth_certificate": True,
        "has_residence_proof": False,
        "photos_count": 0,
        "status": "REGISTERED",
        "commune": {"id": "commune-a", "name": "Commune A"},
        "centre": {"id": "centre-a", "name": "Centre A"},
    }

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path))
        return cin_record

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        reader = main.create_access_token(
            user_with_permissions(["cin:read"]), client.app.state.auth,
        )
        denied = client.get(
            "/api/v1/cin/00000000-0000-4000-8000-000000000001/specimen.pdf",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        )
        assert denied.status_code == 403
        assert forwarded == []

        exporter = main.create_access_token(
            user_with_permissions(["cin:read", "documents:preview"]),
            client.app.state.auth,
        )
        response = client.get(
            "/api/v1/cin/00000000-0000-4000-8000-000000000001/specimen.pdf",
            headers={"Cookie": f"sgaec_access_token={exporter}"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert forwarded == [("GET", "/documents/cin/00000000-0000-4000-8000-000000000001")]


def test_cin_maquette_requires_both_permissions_and_preserves_tenant_scope(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    case_id = "00000000-0000-4000-8000-000000000001"
    record = {
        "id": case_id,
        "file_number": "CIN-DEMO-2026-0001",
        "last_name": "CITOYEN-FICTIF",
        "first_names": "Aina",
        "birth_date": "2004-07-09",
        "birth_place": "Commune fictive A",
        "address": "Adresse fictive",
        "district": "Arrondissement fictif",
        "profession": "",
        "father_name": "",
        "mother_name": "",
    }
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path, tenant.state.user["commune_id"]))
        if tenant.state.user["commune_id"] == "commune-b":
            raise HTTPException(status_code=404, detail="Dossier CIN introuvable")
        return record

    monkeypatch.setattr(main, "forward", fake_forward)
    tenant_user = USER | {
        "communes": [
            USER["communes"][0] | {
                "permissions": ["cin:read", "documents:preview"],
            },
            {
                "id": "commune-b",
                "code": "COMMUNE_B",
                "name": "Commune B",
                "centres": [],
                "roles": ["AGENT_SAISIE"],
                "permissions": ["cin:read", "documents:preview"],
            },
        ],
    }

    with TestClient(main.app) as client:
        assert client.get(f"/api/v1/cin/{case_id}/maquette.pdf").status_code == 401

        cin_reader = main.create_access_token(
            user_with_permissions(["cin:read"]), client.app.state.auth,
        )
        denied_preview = client.get(
            f"/api/v1/cin/{case_id}/maquette.pdf",
            headers={"Cookie": f"sgaec_access_token={cin_reader}"},
        )
        assert denied_preview.status_code == 403

        preview_only = main.create_access_token(
            user_with_permissions(["documents:preview"]), client.app.state.auth,
        )
        denied_read = client.get(
            f"/api/v1/cin/{case_id}/maquette.pdf",
            headers={"Cookie": f"sgaec_access_token={preview_only}"},
        )
        assert denied_read.status_code == 403

        tenant_token = main.create_access_token(tenant_user, client.app.state.auth)
        headers = {"Cookie": f"sgaec_access_token={tenant_token}"}
        response = client.get(f"/api/v1/cin/{case_id}/maquette.pdf", headers=headers)
        other_commune = client.get(
            f"/api/v1/cin/{case_id}/maquette.pdf",
            headers=headers | {"X-Commune-Id": "commune-b"},
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert other_commune.status_code == 404
    assert forwarded == [
        ("GET", f"/documents/cin/{case_id}", "commune-a"),
        ("GET", f"/documents/cin/{case_id}", "commune-b"),
    ]


def test_cin_maquette_rejects_incomplete_or_mismatched_data(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    case_id = "00000000-0000-4000-8000-000000000001"
    data = {"record": {
        "id": case_id,
        "last_name": "CITOYEN-FICTIF",
        "first_names": "Aina",
        "birth_date": "2004-07-09",
        "birth_place": "Commune fictive A",
        "address": "Adresse fictive",
        "district": "Arrondissement fictif",
    }}

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        return data["record"]

    monkeypatch.setattr(main, "forward", fake_forward)
    with TestClient(main.app) as client:
        token = main.create_access_token(
            user_with_permissions(["cin:read", "documents:preview"]),
            client.app.state.auth,
        )
        headers = {"Cookie": f"sgaec_access_token={token}"}
        data["record"] = {"id": case_id, "last_name": "CITOYEN-FICTIF"}
        incomplete = client.get(f"/api/v1/cin/{case_id}/maquette.pdf", headers=headers)
        data["record"] = {
            "id": "00000000-0000-4000-8000-000000000002",
            "last_name": "CITOYEN-FICTIF",
            "first_names": "Aina",
            "birth_date": "2004-07-09",
            "birth_place": "Commune fictive A",
            "address": "Adresse fictive",
            "district": "Arrondissement fictif",
        }
        mismatched = client.get(f"/api/v1/cin/{case_id}/maquette.pdf", headers=headers)

    assert incomplete.status_code == 422
    assert mismatched.status_code == 502


def test_auth_me_reports_roles_and_permissions_for_the_selected_commune(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    tenant_user = USER | {
        "roles": ["COMMUNE_ADMIN", "LECTURE_SEULE"],
        "permissions": ["users:manage", "citizens:read"],
        "communes": [
            {"id": "commune-a", "code": "A", "name": "Commune A",
             "roles": ["COMMUNE_ADMIN"], "permissions": ["users:manage"]},
            {"id": "commune-b", "code": "B", "name": "Commune B",
             "roles": ["LECTURE_SEULE"], "permissions": ["citizens:read"]},
        ],
    }

    with TestClient(main.app) as client:
        token = main.create_access_token(tenant_user, client.app.state.auth)
        response = client.get("/api/v1/auth/me", headers={
            "Cookie": f"sgaec_access_token={token}", "X-Commune-Id": "commune-b",
        })

    assert response.status_code == 200
    assert response.json()["current_commune_id"] == "commune-b"
    assert response.json()["roles"] == ["LECTURE_SEULE"]
    assert response.json()["permissions"] == ["citizens:read"]


def test_authorization_is_scoped_to_selected_commune_not_union_of_roles(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((path, tenant.state.user["commune_id"]))
        return []

    monkeypatch.setattr(main, "forward", fake_forward)
    tenant_user = USER | {
        "roles": ["COMMUNE_ADMIN", "LECTURE_SEULE"],
        "permissions": ["users:manage", "citizens:read"],
        "communes": [
            {"id": "commune-a", "code": "A", "name": "Commune A",
             "roles": ["COMMUNE_ADMIN"], "permissions": ["users:manage"]},
            {"id": "commune-b", "code": "B", "name": "Commune B",
             "roles": ["LECTURE_SEULE"], "permissions": ["citizens:read"]},
        ],
    }
    with TestClient(main.app) as client:
        token = main.create_access_token(tenant_user, client.app.state.auth)
        headers = {"Cookie": f"sgaec_access_token={token}", "X-Commune-Id": "commune-b"}
        assert client.get("/api/v1/users", headers=headers).status_code == 403
        assert client.get("/api/v1/citizens", headers=headers).status_code == 200
        assert client.get("/api/v1/users", headers=headers | {"X-Commune-Id": "commune-a"}).status_code == 200
        assert client.get("/api/v1/users", headers=headers | {"X-Commune-Id": "not-allowed"}).status_code == 403
    assert forwarded == [("/citizens", "commune-b"), ("/users", "commune-a")]


def test_legacy_token_without_commune_permissions_must_renew_session(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    legacy_user = USER | {
        "communes": [{"id": "commune-a", "code": "COMMUNE_A", "name": "Commune A"}],
    }

    with TestClient(main.app) as client:
        token = main.create_access_token(legacy_user, client.app.state.auth)
        response = client.get("/api/v1/dashboard", headers={
            "Cookie": f"sgaec_access_token={token}",
        })

    assert response.status_code == 401
    assert response.json()["detail"] == "Session à renouveler"


def test_cin_workflow_rejects_unauthorized_user_and_forwards_scoped_transition(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path, json, tenant.state.user["commune_id"]))
        return {"id": path.split("/")[-2], "status": json["status"]}

    monkeypatch.setattr(main, "forward", fake_forward)
    record_id = "00000000-0000-4000-8000-000000000001"
    url = f"/api/v1/cin/{record_id}/transition"
    with TestClient(main.app) as client:
        read_only = main.create_access_token(
            user_with_permissions(["cin:read"]), client.app.state.auth,
        )
        headers = {"X-SGAEC-Request": "1", "Origin": "http://localhost:3000"}
        assert client.post(url, json={"status": "IN_REVIEW"}, headers=headers | {
            "Cookie": f"sgaec_access_token={read_only}",
        }).status_code == 403
        validator = main.create_access_token(
            user_with_permissions(["cin:read", "cin:workflow"]), client.app.state.auth,
        )
        response = client.post(url, json={"status": "IN_REVIEW"}, headers=headers | {
            "Cookie": f"sgaec_access_token={validator}",
        })
        assert response.status_code == 200
        assert response.json()["status"] == "IN_REVIEW"
        assert client.post(url, json={"status": "INVALID"}, headers=headers | {
            "Cookie": f"sgaec_access_token={validator}",
        }).status_code == 422
    assert forwarded == [(
        "POST", f"/cin/{record_id}/transition", {"status": "IN_REVIEW", "reason": ""}, "commune-a",
    )]


def test_cin_evidence_update_and_history_use_territory_permissions(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setenv("WEB_ORIGIN", "http://localhost:3000")
    monkeypatch.setattr(main, "TOKEN", "test-internal-token-long-enough")
    forwarded = []

    async def fake_forward(method, path, *, json=None, params=None, tenant=None):
        forwarded.append((method, path, json, tenant.state.user["commune_id"]))
        return [] if method == "GET" else {"status": "IN_REVIEW", **json}

    monkeypatch.setattr(main, "forward", fake_forward)
    cin_id = "00000000-0000-4000-8000-000000000001"
    url = f"/api/v1/cin/{cin_id}/evidence"
    evidence = {"has_birth_certificate": True, "has_residence_proof": True, "photos_count": 2}
    with TestClient(main.app) as client:
        reader = main.create_access_token(user_with_permissions(["cin:read"]), client.app.state.auth)
        create_agent = main.create_access_token(
            user_with_permissions(["cin:read", "cin:create"]), client.app.state.auth,
        )
        headers = {"X-SGAEC-Request": "1", "Origin": "http://localhost:3000"}
        assert client.put(url, json=evidence, headers=headers | {
            "Cookie": f"sgaec_access_token={reader}",
        }).status_code == 403
        assert client.put(url, json=evidence, headers=headers | {
            "Cookie": f"sgaec_access_token={create_agent}",
        }).status_code == 200
        assert client.put(url, json=evidence | {"photos_count": 99}, headers=headers | {
            "Cookie": f"sgaec_access_token={create_agent}",
        }).status_code == 422
        assert client.get(f"/api/v1/cin/{cin_id}/history", headers={
            "Cookie": f"sgaec_access_token={reader}",
        }).status_code == 200
    assert forwarded == [
        ("PUT", f"/cin/{cin_id}/evidence", evidence, "commune-a"),
        ("GET", f"/cin/{cin_id}/history", None, "commune-a"),
    ]
