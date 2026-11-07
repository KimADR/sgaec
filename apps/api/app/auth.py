from dataclasses import dataclass
import os
import time
from urllib.parse import urlsplit

import jwt


@dataclass(frozen=True)
class AuthConfig:
    jwt_secret: str
    issuer: str
    audience: str
    ttl_minutes: int
    cookie_secure: bool
    web_origin: str


def load_auth_config() -> AuthConfig:
    jwt_secret = os.getenv("JWT_SECRET", "")
    issuer = os.getenv("JWT_ISSUER", "sgaec-api")
    audience = os.getenv("JWT_AUDIENCE", "sgaec-web")
    ttl_minutes = int(os.getenv("JWT_TTL_MINUTES", "30"))

    if len(jwt_secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 bytes.")
    if not issuer or not audience:
        raise RuntimeError("JWT_ISSUER and JWT_AUDIENCE must not be empty.")
    if not 5 <= ttl_minutes <= 120:
        raise RuntimeError("JWT_TTL_MINUTES must be between 5 and 120.")
    web_origin = os.getenv("WEB_ORIGIN", "http://localhost:3000").rstrip("/")
    parsed_origin = urlsplit(web_origin)
    if parsed_origin.scheme not in {"http", "https"} or not parsed_origin.netloc or parsed_origin.path:
        raise RuntimeError("WEB_ORIGIN must be an absolute HTTP(S) origin.")
    cookie_secure_value = os.getenv("AUTH_COOKIE_SECURE", "false").lower()
    if cookie_secure_value not in {"true", "false"}:
        raise RuntimeError("AUTH_COOKIE_SECURE must be true or false.")

    return AuthConfig(
        jwt_secret=jwt_secret,
        issuer=issuer,
        audience=audience,
        ttl_minutes=ttl_minutes,
        cookie_secure=cookie_secure_value == "true",
        web_origin=web_origin,
    )


def create_access_token(user: dict, config: AuthConfig) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "sub": user["id"],
            "username": user["username"],
            "roles": user["roles"],
            "permissions": user["permissions"],
            "communes": user["communes"],
            "iss": config.issuer,
            "aud": config.audience,
            "iat": now,
            "exp": now + config.ttl_minutes * 60,
        },
        config.jwt_secret,
        algorithm="HS256",
    )


def decode_access_token(token: str, config: AuthConfig) -> dict:
    return jwt.decode(
        token,
        config.jwt_secret,
        algorithms=["HS256"],
        issuer=config.issuer,
        audience=config.audience,
        options={"require": ["sub", "username", "roles", "permissions", "communes", "iss", "aud", "iat", "exp"]},
    )
