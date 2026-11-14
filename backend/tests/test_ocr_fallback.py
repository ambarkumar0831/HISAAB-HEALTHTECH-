import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.database.session import Base, get_user_db
from app.main import app
from app.models.schemas import BillExtraction
from app.services.gemini_service import GeminiService
from app.services.ocr_service import OCRService


@pytest.mark.parametrize(
    ("gemini_result", "expected_method"),
    [
        ("valid", "GEMINI"),
        ("raises", "TESSERACT"),
        ("empty", "TESSERACT"),
    ],
)
def test_ocr_is_used_only_after_gemini_fails(
    monkeypatch, tmp_path, gemini_result, expected_method
):
    test_user = AuthenticatedUser(
        id=str(uuid.uuid4()),
        email="synthetic-patient@example.test",
        app_metadata={"hisaab_role": "admin"},
        claims={},
    )
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))
    ocr_calls = []
    ocr_initializations = []

    def override_current_user():
        return test_user

    def override_user_db():
        with Session(test_engine) as session:
            yield session

    async def fake_gemini(self, file_path, file_mime):
        assert os.path.isfile(file_path)
        if gemini_result == "raises":
            raise RuntimeError("synthetic Gemini failure")
        if gemini_result == "empty":
            return BillExtraction()
        return BillExtraction(grand_total=100)

    async def fake_ocr(self, file_path):
        ocr_calls.append(file_path)
        return BillExtraction(
            grand_total=100,
            uncertain_fields=["items", "grand_total"],
            extraction_method="TESSERACT",
        )

    def fake_ocr_init(self):
        ocr_initializations.append(True)
        self.available = True

    monkeypatch.setattr(GeminiService, "extract_bill", fake_gemini)
    monkeypatch.setattr(OCRService, "__init__", fake_ocr_init)
    monkeypatch.setattr(OCRService, "extract_bill", fake_ocr)
    original_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_user_db] = override_user_db

    try:
        with TestClient(app) as client:
            upload_response = client.post(
                "/api/audits/upload",
                files={"file": ("synthetic.png", b"synthetic image content", "image/png")},
            )
            assert upload_response.status_code == 202
            audit_id = upload_response.json()["audit_id"]

            extraction_response = client.post(f"/api/audits/{audit_id}/extract")

        assert extraction_response.status_code == 200
        assert extraction_response.json()["extraction_method"] == expected_method
        used_ocr = gemini_result != "valid"
        assert len(ocr_calls) == int(used_ocr)
        assert len(ocr_initializations) == int(used_ocr)
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)
        test_engine.dispose()
