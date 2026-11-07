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
    "communes": [{"id": "commune-a", "code": "COMMUNE_A", "name": "Commune A", "centres": []}],
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
            USER | {"permissions": ["citizens:read"]}, client.app.state.auth,
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
            USER | {"permissions": ["citizens:read", "citizens:manage"]},
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
            USER | {"permissions": ["births:read", "cin:read"]},
            client.app.state.auth,
        )
        denied = client.get(
            "/api/v1/documents/export.zip",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        )
        assert denied.status_code == 403
        assert forwarded == []

        exporter = main.create_access_token(
            USER | {"permissions": ["births:read", "cin:read", "documents:preview"]},
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
            USER | {"permissions": ["cin:read"]}, client.app.state.auth,
        )
        denied = client.get(
            "/api/v1/cin/00000000-0000-4000-8000-000000000001/specimen.pdf",
            headers={"Cookie": f"sgaec_access_token={reader}"},
        )
        assert denied.status_code == 403
        assert forwarded == []

        exporter = main.create_access_token(
            USER | {"permissions": ["cin:read", "documents:preview"]},
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
