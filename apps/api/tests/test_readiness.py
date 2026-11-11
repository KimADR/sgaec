import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main


def _configure_demo(monkeypatch):
    monkeypatch.setenv("APP_MODE", "demo")
    monkeypatch.setenv("JWT_SECRET", "test-signing-key-with-at-least-32-bytes")
    monkeypatch.setattr(main, "TOKEN", "token-for-regression-testing-1234")


def test_api_liveness_is_independent_of_the_data_service(monkeypatch):
    _configure_demo(monkeypatch)
    with TestClient(main.app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_ready_returns_503_when_data_service_is_unavailable(monkeypatch):
    _configure_demo(monkeypatch)
    with TestClient(main.app) as client:
        async def unavailable(*_args, **_kwargs):
            raise httpx.ConnectError("offline")

        monkeypatch.setattr(client.app.state.data, "get", unavailable)
        response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["ok"] is False


def test_ready_returns_success_when_data_service_is_available(monkeypatch):
    _configure_demo(monkeypatch)
    with TestClient(main.app) as client:
        async def available(*_args, **_kwargs):
            return httpx.Response(200)

        monkeypatch.setattr(client.app.state.data, "get", available)
        response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["data"] == "ready"


def test_forward_rejects_html_error_pages_without_leaking_them(monkeypatch):
    class InvalidUpstream:
        async def request(self, method, path, **kwargs):
            return httpx.Response(
                500,
                text="<html>Proxy server failed (internal details)</html>",
            )

    original = getattr(main.app.state, "data", None)
    main.app.state.data = InvalidUpstream()
    try:
        with pytest.raises(HTTPException) as failure:
            import asyncio

            asyncio.run(main.forward("GET", "/summary"))
        assert failure.value.status_code == 502
        assert "internal details" not in failure.value.detail
    finally:
        main.app.state.data = original


def test_forward_rejects_invalid_success_payload(monkeypatch):
    class InvalidUpstream:
        async def request(self, method, path, **kwargs):
            return httpx.Response(200, text="invalid service response")

    original = getattr(main.app.state, "data", None)
    main.app.state.data = InvalidUpstream()
    try:
        with pytest.raises(HTTPException) as failure:
            import asyncio

            asyncio.run(main.forward("GET", "/summary"))
        assert failure.value.status_code == 502
    finally:
        main.app.state.data = original


@pytest.mark.parametrize(
    "record",
    [
        {},
        {"last_name": "RAKOTO"},
        {
            "record_number": "N-DEMO-1",
            "last_name": "RAKOTO",
            "first_names": "Aina",
            "birth_date": "not-a-date",
            "sex": "F",
            "place_of_birth": "Centre fictif",
            "nationality": "Malagasy",
            "district": "Arrondissement fictif",
        },
        {
            "record_number": "N-DEMO-1",
            "last_name": "RAKOTO",
            "first_names": "Aina",
            "birth_date": "2000-01-01",
            "sex": "X",
            "place_of_birth": "Centre fictif",
            "nationality": "Malagasy",
            "district": "Arrondissement fictif",
        },
    ],
)
def test_incomplete_or_invalid_birth_document_is_rejected(record):
    with pytest.raises(HTTPException) as failure:
        main.checked_birth_document(record)
    assert failure.value.status_code == 502
