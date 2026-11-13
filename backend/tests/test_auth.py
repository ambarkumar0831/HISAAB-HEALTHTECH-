import os
import sys
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.auth import get_current_user, require_admin
from app.core.config import settings
from app.main import app

PROJECT_URL = "https://hisaab-test.supabase.co"
JWT_SECRET = "test-only-signing-secret"
USER_ID = "b1c2a15f-f4e9-4de2-8fd4-3c88a06b376a"
client = TestClient(app)


@pytest.fixture(autouse=True)
def configure_test_auth(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", PROJECT_URL)
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", JWT_SECRET)


def _token(**overrides):
    claims = {
        "sub": USER_ID,
        "aud": "authenticated",
        "iss": f"{PROJECT_URL}/auth/v1",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "email": "patient@example.test",
        "app_metadata": {"provider": "email"},
    }
    claims.update(overrides)
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def _credentials(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_current_user_accepts_a_valid_supabase_token():
    user = get_current_user(_credentials(_token()))

    assert user.id == USER_ID
    assert user.email == "patient@example.test"
    assert user.app_metadata["provider"] == "email"


@pytest.mark.parametrize(
    "overrides",
    [
        {"iss": "https://attacker.example/auth/v1"},
        {"aud": "anon"},
        {"exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
    ],
)
def test_current_user_rejects_invalid_supabase_claims(overrides):
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(_credentials(_token(**overrides)))

    assert exc_info.value.status_code == 401


def test_current_user_requires_a_bearer_token():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(None)

    assert exc_info.value.status_code == 401


@pytest.mark.parametrize("path", ["/api/audits", "/api/dashboard/stats", "/api/benchmarks"])
def test_patient_api_rejects_anonymous_requests(path):
    response = client.get(path)

    assert response.status_code == 401


def test_admin_access_requires_trusted_app_metadata():
    user = get_current_user(
        _credentials(_token(app_metadata={"hisaab_role": "admin"}))
    )

    assert require_admin(user).id == USER_ID

    patient = get_current_user(_credentials(_token()))
    with pytest.raises(HTTPException) as exc_info:
        require_admin(patient)
    assert exc_info.value.status_code == 403
