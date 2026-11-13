import threading
import time
from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)
_jwks_lock = threading.Lock()
_jwks_cache: tuple[float, list[dict[str, Any]]] | None = None
_JWKS_CACHE_SECONDS = 300


class AuthenticatedUser(BaseModel):
    id: str
    email: str | None = None
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    claims: dict[str, Any]


def _get_jwks() -> list[dict[str, Any]]:
    global _jwks_cache

    now = time.monotonic()
    with _jwks_lock:
        if _jwks_cache and now - _jwks_cache[0] < _JWKS_CACHE_SECONDS:
            return _jwks_cache[1]

        if not settings.SUPABASE_URL:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase authentication is not configured",
            )

        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        try:
            response = httpx.get(jwks_url, timeout=5.0)
            response.raise_for_status()
            keys = response.json().get("keys", [])
        except (httpx.HTTPError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not retrieve Supabase signing keys",
            ) from exc

        if not isinstance(keys, list) or not keys:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase did not return any signing keys",
            )

        _jwks_cache = (now, keys)
        return keys


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured",
        )

    token = credentials.credentials
    issuer = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Supabase JWT verification is not configured",
                )
            signing_key: Any = settings.SUPABASE_JWT_SECRET
        elif algorithm in {"ES256", "RS256"}:
            kid = header.get("kid")
            signing_key = next(
                (
                    key
                    for key in _get_jwks()
                    if key.get("kid") == kid
                    and key.get("use", "sig") == "sig"
                    and key.get("alg", algorithm) == algorithm
                ),
                None,
            )
            if signing_key is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired access token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unsupported access token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        claims = jwt.decode(
            token,
            signing_key,
            algorithms=[algorithm],
            audience="authenticated",
            issuer=issuer,
        )
        user_id = str(UUID(claims["sub"]))
    except HTTPException:
        raise
    except (JWTError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    app_metadata = claims.get("app_metadata")
    return AuthenticatedUser(
        id=user_id,
        email=claims.get("email"),
        app_metadata=app_metadata if isinstance(app_metadata, dict) else {},
        claims=claims,
    )


def require_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.app_metadata.get("hisaab_role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required",
        )
    return user
