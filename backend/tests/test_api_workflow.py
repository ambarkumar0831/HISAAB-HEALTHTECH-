"""End-to-end tests for the authenticated patient API using synthetic data."""

import os
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.database.session import Base, get_user_db
from app.main import app
from app.models.schemas import BillExtraction, BillItemExtract
from app.services.gemini_service import GeminiService


def test_authenticated_patient_workflow(monkeypatch, tmp_path):
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
    upload_dir = tmp_path / "uploads"
    report_dir = tmp_path / "reports"
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(upload_dir))
    monkeypatch.setattr(settings, "REPORT_DIR", str(report_dir))

    def override_current_user():
        return test_user

    def override_user_db():
        with Session(test_engine) as session:
            yield session

    async def fake_extract_bill(self, file_path, file_mime):
        assert os.path.isfile(file_path)
        assert file_mime == "image/png"
        return BillExtraction(
            hospital_name="Synthetic Hospital",
            bill_number="SYNTHETIC-001",
            bill_date="2025-01-03",
            admission_date="2025-01-01",
            discharge_date="2025-01-03",
            subtotal=200,
            discount=0,
            tax=0,
            grand_total=200,
            items=[
                BillItemExtract(
                    item_name="Synthetic lab panel",
                    quantity=2,
                    unit_price=100,
                    total=200,
                    category="laboratory",
                )
            ],
        )

    monkeypatch.setattr(GeminiService, "extract_bill", fake_extract_bill)
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
            assert extraction_response.json()["extraction"]["bill_date"] == "2025-01-03"

            assert client.post(f"/api/audits/{audit_id}/analyze").status_code == 409
            confirmed_extraction = extraction_response.json()["extraction"]
            confirmed_extraction["subtotal"] = 300
            confirmed_extraction["grand_total"] = 300
            confirmed_extraction["items"][0]["quantity"] = 3
            confirmed_extraction["items"][0]["total"] = 300
            confirm_response = client.put(
                f"/api/audits/{audit_id}/confirm",
                json=confirmed_extraction,
            )
            assert confirm_response.status_code == 200
            assert confirm_response.json()["status"] == "CONFIRMED"

            analysis_response = client.post(f"/api/audits/{audit_id}/analyze")
            assert analysis_response.status_code == 200
            assert analysis_response.json()["date_checks"]["stay_days"] == 2
            assert analysis_response.json()["calculated_total"] == 300

            detail_response = client.get(f"/api/audits/{audit_id}")
            assert detail_response.status_code == 200
            assert detail_response.json()["bill_items"][0]["description"] == "Synthetic lab panel"
            assert detail_response.json()["subtotal"] == 300
            assert detail_response.json()["extraction_confirmed"] is True

            history_response = client.get("/api/audits")
            assert history_response.status_code == 200
            assert [audit["id"] for audit in history_response.json()] == [audit_id]

            dashboard_response = client.get("/api/dashboard/stats")
            assert dashboard_response.status_code == 200
            assert dashboard_response.json()["total_audits"] == 1

            for document_path in ("report", "appeal"):
                document_response = client.get(f"/api/audits/{audit_id}/{document_path}")
                assert document_response.status_code == 200
                assert document_response.headers["content-type"] == "application/pdf"
                assert document_response.content.startswith(b"%PDF")

            custom_appeal_response = client.post(
                f"/api/audits/{audit_id}/appeal",
                json={"questions": ["Please explain this synthetic charge."]},
            )
            assert custom_appeal_response.status_code == 200
            assert custom_appeal_response.content.startswith(b"%PDF")

            assert client.get("/api/benchmarks").status_code == 200
            benchmark_response = client.post(
                "/api/benchmarks",
                json={
                    "service_name": "Synthetic lab panel",
                    "category": "laboratory",
                    "rate": 100,
                    "source_name": "Synthetic test data",
                    "source_url": "https://example.test/synthetic-rates",
                    "applicability_notes": "Example-only & not patient-specific.",
                    "effective_from": "2025-01-01",
                },
            )
            assert benchmark_response.status_code == 201
            benchmark_id = benchmark_response.json()["id"]

            assert client.get(f"/api/benchmarks/{benchmark_id}").status_code == 200
            updated_benchmark = client.put(
                f"/api/benchmarks/{benchmark_id}",
                json={
                    "service_name": "Synthetic lab panel",
                    "category": "laboratory",
                    "rate": 125,
                    "source_name": "Synthetic test data",
                    "source_url": "https://example.test/synthetic-rates",
                    "applicability_notes": "Example-only & not patient-specific.",
                    "effective_from": "2025-01-01",
                },
            )
            assert updated_benchmark.status_code == 200
            assert updated_benchmark.json()["rate"] == 125
            benchmark_analysis = client.post(f"/api/audits/{audit_id}/analyze")
            assert benchmark_analysis.status_code == 200
            benchmark_detail = client.get(f"/api/audits/{audit_id}").json()
            assert benchmark_detail["benchmark_review"]["benchmarks_checked"] == 1
            assert benchmark_detail["benchmark_review"]["source_url"] == "https://example.test/synthetic-rates"
            benchmark_finding = next(
                finding for finding in benchmark_detail["findings"]
                if finding["finding_type"] == "BENCHMARK"
            )
            assert benchmark_finding["bill_item_id"] == benchmark_detail["bill_items"][0]["id"]
            assert benchmark_finding["source_date"] == "2025-01-01"
            cited_report = client.get(f"/api/audits/{audit_id}/report")
            assert cited_report.status_code == 200
            assert cited_report.content.startswith(b"%PDF")
            assert client.delete(f"/api/benchmarks/{benchmark_id}").status_code == 204

            assert client.delete(f"/api/audits/{audit_id}").status_code == 200
            assert client.get(f"/api/audits/{audit_id}").status_code == 404
            assert client.get("/api/audits").json() == []
            assert list(upload_dir.iterdir()) == []
            assert list(report_dir.iterdir()) == []
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)
        test_engine.dispose()
