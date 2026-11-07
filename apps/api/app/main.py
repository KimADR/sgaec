from contextlib import asynccontextmanager
import os
import re
from typing import Any, Literal
from uuid import UUID

import httpx
import jwt
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response

from .auth import AuthConfig, create_access_token, decode_access_token, load_auth_config
from .models import (
    BirthCreate,
    BirthTransition,
    CitizenCreate,
    CitizenUpdate,
    CinCreate,
    LoginRequest,
    UserCreate,
)
from .pdf import render_birth_specimen, render_cin_specimen, render_specimen_archive

DATA_URL = os.getenv("DATA_SERVICE_URL", "http://localhost:4000")
TOKEN = os.getenv("INTERNAL_API_TOKEN", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("APP_MODE") != "demo":
        raise RuntimeError("Ce prototype doit uniquement être exécuté avec APP_MODE=demo")
    if len(TOKEN) < 20:
        raise RuntimeError("Définir INTERNAL_API_TOKEN avec au moins 20 caractères")
    app.state.auth = load_auth_config()
    app.state.data = httpx.AsyncClient(base_url=DATA_URL, timeout=15.0,
                                       headers={"x-internal-token": TOKEN})
    yield
    await app.state.data.aclose()


app = FastAPI(
    title="SGAEC - API de démonstration",
    description="Prototype non destiné au traitement de données personnelles réelles.",
    version="0.1.0",
    lifespan=lifespan,
)


async def forward(method: str, path: str, *, json: dict | None = None,
                  params: dict | None = None, tenant: Request | None = None) -> Any:
    headers = None
    if tenant is not None:
        user = tenant.state.user
        headers = {
            "x-user-id": user["sub"],
            "x-commune-id": user["commune_id"],
        }
    try:
        response = await app.state.data.request(
            method, f"/internal{path}", json=json, params=params, headers=headers,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Service de données indisponible") from exc
    if response.status_code >= 400:
        detail = response.json().get("detail", "Erreur du service de données")
        if response.status_code >= 500:
            raise HTTPException(status_code=502, detail="Erreur interne du service de données")
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()


@app.middleware("http")
async def demo_security_headers(request, call_next):
    path = request.url.path
    is_login = path == "/api/v1/auth/login" and request.method == "POST"
    is_public = path == "/health" or is_login or path in {
        "/docs", "/openapi.json", "/redoc",
    }

    if path.startswith("/api/v1/") and not is_public:
        config: AuthConfig = request.app.state.auth
        authorization = request.headers.get("authorization", "")
        scheme, separator, credentials = authorization.partition(" ")
        token = credentials.strip() if separator and scheme.lower() == "bearer" else ""
        bearer_token = token
        token = token or request.cookies.get("sgaec_access_token", "")
        if not token:
            return JSONResponse(
                {"detail": "Authentification requise"},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            request.state.user = decode_access_token(token, config)
        except jwt.InvalidTokenError:
            return JSONResponse(
                {"detail": "Session invalide ou expirée"},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = request.state.user
        if not isinstance(user.get("communes"), list) or not user["communes"]:
            return JSONResponse({"detail": "Aucune affectation territoriale active"}, status_code=403)
        requested_commune = request.headers.get("x-commune-id")
        selected_commune = next(
            (commune for commune in user["communes"]
             if isinstance(commune, dict) and commune.get("id") == requested_commune),
            None,
        ) if requested_commune else user["communes"][0]
        if not isinstance(selected_commune, dict) or not selected_commune.get("id"):
            return JSONResponse({"detail": "Commune non autorisée"}, status_code=403)
        user["commune_id"] = selected_commune["id"]
        permission = permission_for_request(request.method, path)
        granted_permissions = user.get("permissions", [])
        if isinstance(permission, tuple):
            permitted = any(item in granted_permissions for item in permission)
        else:
            permitted = permission is None or permission in granted_permissions
        if not permitted:
            return JSONResponse({"detail": "Permission insuffisante"}, status_code=403)
        if (
            not bearer_token
            and request.method in {"POST", "PUT", "PATCH", "DELETE"}
            and request.headers.get("x-sgaec-request") != "1"
        ):
            return JSONResponse({"detail": "Requête non autorisée"}, status_code=403)
        origin = request.headers.get("origin")
        if not bearer_token and origin and origin.rstrip("/") != config.web_origin:
            return JSONResponse({"detail": "Origine non autorisée"}, status_code=403)

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/health")
async def health():
    return {"ok": True, "service": "sgaec-api", "mode": "demo"}


@app.post("/api/v1/auth/login")
async def login(request: Request, body: LoginRequest):
    user = await forward("POST", "/auth/login", json=body.model_dump())
    config: AuthConfig = request.app.state.auth

    response = JSONResponse({
        "username": user["username"],
        "roles": user["roles"],
        "communes": user["communes"],
        "expires_in": config.ttl_minutes * 60,
    })
    response.set_cookie(
        "sgaec_access_token",
        create_access_token(user, config),
        max_age=config.ttl_minutes * 60,
        httponly=True,
        secure=config.cookie_secure,
        samesite="strict",
        path="/backend/api/v1",
    )
    return response


@app.get("/api/v1/auth/me")
async def current_user(request: Request):
    user = request.state.user
    selected_commune = next(
        commune for commune in user["communes"] if commune["id"] == user["commune_id"]
    )
    return {
        "id": user["sub"],
        "username": user["username"],
        "roles": selected_commune.get("roles", user["roles"]),
        "communes": user["communes"],
        "current_commune_id": user["commune_id"],
    }


@app.post("/api/v1/auth/logout")
async def logout(request: Request):
    response = JSONResponse({"ok": True})
    response.delete_cookie(
        "sgaec_access_token",
        httponly=True,
        secure=request.app.state.auth.cookie_secure,
        samesite="strict",
        path="/backend/api/v1",
    )
    return response


@app.get("/api/v1/users")
async def list_users(request: Request):
    return await forward("GET", "/users", tenant=request)


@app.get("/api/v1/user-options")
async def user_options(request: Request):
    return await forward("GET", "/user-options", tenant=request)


@app.post("/api/v1/users", status_code=201)
async def create_user(request: Request, body: UserCreate):
    return await forward(
        "POST",
        "/users",
        json=body.model_dump(mode="json"),
        tenant=request,
    )


@app.get("/api/v1/dashboard")
async def dashboard(request: Request):
    return await forward("GET", "/summary", tenant=request)


@app.get("/api/v1/citizens")
async def list_citizens(request: Request, q: str = Query(default="", max_length=80)):
    return await forward("GET", "/citizens", params={"q": q}, tenant=request)


@app.get("/api/v1/citizens/{citizen_id}")
async def get_citizen(citizen_id: UUID, request: Request):
    return await forward("GET", f"/citizens/{citizen_id}", tenant=request)


@app.post("/api/v1/citizens", status_code=201)
async def create_citizen(request: Request, body: CitizenCreate):
    return await forward(
        "POST",
        "/citizens",
        json=body.model_dump(mode="json"),
        tenant=request,
    )


@app.put("/api/v1/citizens/{citizen_id}")
async def update_citizen(citizen_id: UUID, request: Request, body: CitizenUpdate):
    return await forward(
        "PUT",
        f"/citizens/{citizen_id}",
        json=body.model_dump(mode="json"),
        tenant=request,
    )


@app.delete("/api/v1/citizens/{citizen_id}")
async def archive_citizen(citizen_id: UUID, request: Request):
    return await forward("DELETE", f"/citizens/{citizen_id}", tenant=request)


@app.get("/api/v1/births")
async def list_births(request: Request, q: str = Query(default="", max_length=80)):
    return await forward("GET", "/births", params={"q": q}, tenant=request)


@app.post("/api/v1/births", status_code=201)
async def create_birth(request: Request, body: BirthCreate):
    return await forward("POST", "/births",
                         json=body.model_dump(mode="json"), tenant=request)


@app.post("/api/v1/births/{record_id}/transition")
async def transition_birth(record_id: UUID, request: Request, body: BirthTransition):
    return await forward(
        "POST",
        f"/births/{record_id}/transition",
        json=body.model_dump(mode="json"),
        tenant=request,
    )


@app.get("/api/v1/births/{record_id}")
async def get_birth(record_id: UUID, request: Request):
    return await forward("GET", f"/births/{record_id}", tenant=request)


@app.get("/api/v1/births/{record_id}/specimen.pdf")
async def birth_specimen(record_id: UUID, request: Request):
    record = await forward("GET", f"/documents/births/{record_id}", tenant=request)
    pdf = render_birth_specimen(record)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="naissance-specimen-{str(record_id)[:8]}.pdf"',
                             "Cache-Control": "no-store"})


@app.get("/api/v1/cin")
async def list_cin(request: Request, q: str = Query(default="", max_length=80)):
    return await forward("GET", "/cin", params={"q": q}, tenant=request)


@app.post("/api/v1/cin", status_code=201)
async def create_cin(request: Request, body: CinCreate):
    return await forward("POST", "/cin",
                         json=body.model_dump(mode="json"), tenant=request)


@app.get("/api/v1/cin/{case_id}")
async def get_cin(case_id: UUID, request: Request):
    return await forward("GET", f"/cin/{case_id}", tenant=request)


@app.get("/api/v1/cin/{case_id}/specimen.pdf")
async def cin_specimen(case_id: UUID, request: Request):
    record = await forward("GET", f"/documents/cin/{case_id}", tenant=request)
    pdf = render_cin_specimen(record)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="cin-specimen-{str(case_id)[:8]}.pdf"',
            "Cache-Control": "no-store",
        },
    )


@app.get("/api/v1/documents/export.zip")
async def export_specimens(
    request: Request,
    export_type: Literal["all", "births", "cin"] = Query(default="all", alias="type"),
):
    data = await forward(
        "GET",
        "/documents/export",
        params={"type": export_type},
        tenant=request,
    )
    archive = render_specimen_archive(data)
    commune_code = re.sub(r"[^A-Za-z0-9._-]+", "-", data["commune"]["code"]).strip("-")
    filename = f"sgaec-specimens-{commune_code or 'commune'}.zip"
    return Response(
        content=archive,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


def permission_for_request(method: str, path: str) -> str | tuple[str, ...] | None:
    if path in {"/api/v1/auth/me", "/api/v1/auth/logout"}:
        return None
    if path == "/api/v1/dashboard":
        return "dashboard:read"
    if path == "/api/v1/documents/export.zip":
        return "documents:preview"
    if path.startswith("/api/v1/citizens"):
        return "citizens:manage" if method in {"POST", "PUT", "DELETE"} else "citizens:read"
    if path in {"/api/v1/users", "/api/v1/user-options"}:
        return "users:manage"
    if path.startswith("/api/v1/births"):
        if path.endswith("/specimen.pdf"):
            return "documents:preview"
        if path.endswith("/transition"):
            return ("births:workflow", "documents:deliver") if method == "POST" else "births:workflow"
        return "births:create" if method == "POST" and path == "/api/v1/births" else "births:read"
    if path.startswith("/api/v1/cin"):
        if path.endswith("/specimen.pdf"):
            return "documents:preview"
        return "cin:create" if method == "POST" and path == "/api/v1/cin" else "cin:read"
    return None
