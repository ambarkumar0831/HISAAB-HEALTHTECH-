"""Regression tests for extracting and persisting bill dates."""

from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models.schemas import BillExtraction
from app.models.sqlmodels import Audit
from app.services.audit_engine import AuditEngine


def test_extracted_iso_dates_persist_as_sql_dates():
    extraction = BillExtraction(
        bill_date="2025-01-03",
        admission_date="2025-01-01",
        discharge_date="2025-01-03",
    )
    assert extraction.model_dump(mode="json")["bill_date"] == "2025-01-03"
    result = AuditEngine().audit(extraction)
    assert result["date_checks"]["stay_days"] == 2

    engine = create_engine("sqlite:///:memory:")
    Audit.__table__.create(engine)

    with Session(engine) as session:
        audit = Audit(
            id="audit-date-test",
            user_id="test-user",
            bill_date=extraction.bill_date,
            admission_date=extraction.admission_date,
            discharge_date=extraction.discharge_date,
        )
        session.add(audit)
        session.commit()
        session.refresh(audit)

        assert audit.bill_date == date(2025, 1, 3)
        assert audit.admission_date == date(2025, 1, 1)
        assert audit.discharge_date == date(2025, 1, 3)

    engine.dispose()
