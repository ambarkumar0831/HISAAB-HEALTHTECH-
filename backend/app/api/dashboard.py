from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.sqlmodels import Audit, AuditFinding
from app.models.schemas import DashboardStats

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(user_id: str = "anonymous", db: Session = Depends(get_db)):
    audits = db.query(Audit).filter(Audit.user_id == user_id).all()
    total_audits = len(audits)
    total_findings = 0
    arithmetic = 0
    duplicates = 0
    benchmarks = 0

    for a in audits:
        findings = db.query(AuditFinding).filter(AuditFinding.audit_id == a.id).all()
        total_findings += len(findings)
        for f in findings:
            if f.finding_type == "ARITHMETIC":
                arithmetic += 1
            elif f.finding_type == "DUPLICATE":
                duplicates += 1
            elif f.finding_type == "BENCHMARK":
                benchmarks += 1

    recent = db.query(Audit).filter(Audit.user_id == user_id).order_by(Audit.created_at.desc()).limit(5).all()

    return DashboardStats(
        total_audits=total_audits,
        total_findings=total_findings,
        arithmetic_discrepancies=arithmetic,
        duplicate_entries=duplicates,
        benchmark_discrepancies=benchmarks,
        recent_audits=recent,
    )
