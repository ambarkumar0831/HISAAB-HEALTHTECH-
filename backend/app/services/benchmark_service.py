import logging
from typing import List, Optional, Dict, Any
from datetime import date

from app.models.sqlmodels import BenchmarkRate
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)


class BenchmarkService:
    """Service for managing and matching hospital rate benchmarks."""

    def __init__(self, db=None):
        self.db = db or SessionLocal()

    def list_benchmarks(self) -> List[Dict[str, Any]]:
        rows = self.db.query(BenchmarkRate).all()
        return [self._row_to_dict(r) for r in rows]

    def get_benchmark(self, rate_id: str) -> Optional[Dict[str, Any]]:
        row = self.db.query(BenchmarkRate).filter(BenchmarkRate.id == rate_id).first()
        return self._row_to_dict(row) if row else None

    def create_benchmark(self, data: Dict[str, Any]) -> Dict[str, Any]:
        import uuid
        row = BenchmarkRate(
            id=str(uuid.uuid4()),
            service_name=data["service_name"],
            normalized_service_name=data["service_name"].strip().lower(),
            category=data.get("category"),
            rate=data["rate"],
            source_name=data.get("source_name"),
            source_url=data.get("source_url"),
            location=data.get("location"),
            applicability_notes=data.get("applicability_notes"),
            effective_from=date.fromisoformat(data["effective_from"]) if data.get("effective_from") else None,
            effective_until=date.fromisoformat(data["effective_until"]) if data.get("effective_until") else None,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._row_to_dict(row)

    def update_benchmark(self, rate_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        row = self.db.query(BenchmarkRate).filter(BenchmarkRate.id == rate_id).first()
        if not row:
            return None
        for field in [
            "service_name", "category", "rate", "source_name", "source_url",
            "location", "applicability_notes",
        ]:
            if field in data:
                setattr(row, field, data[field])
        if "effective_from" in data and data["effective_from"]:
            row.effective_from = date.fromisoformat(data["effective_from"])
        if "effective_until" in data:
            row.effective_until = date.fromisoformat(data["effective_until"]) if data["effective_until"] else None
        self.db.commit()
        self.db.refresh(row)
        return self._row_to_dict(row)

    def delete_benchmark(self, rate_id: str) -> bool:
        row = self.db.query(BenchmarkRate).filter(BenchmarkRate.id == rate_id).first()
        if not row:
            return False
        self.db.delete(row)
        self.db.commit()
        return True

    def find_matching_benchmark(self, service_name: str, benchmarks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find the best matching benchmark for a bill item name."""
        name_lower = service_name.strip().lower()
        best = None
        best_score = 0

        for b in benchmarks:
            bname = (b.get("normalized_service_name") or b.get("service_name") or "").strip().lower()
            if not bname:
                continue
            score = 0
            if name_lower == bname:
                score = 100
            elif name_lower in bname or bname in name_lower:
                score = 70
            elif any(word in bname for word in name_lower.split() if len(word) > 3):
                score = 40
            if score > best_score:
                best_score = score
                best = b

        return best if best_score >= 40 else None

    @staticmethod
    def _row_to_dict(row) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        return {
            "id": row.id,
            "service_name": row.service_name,
            "normalized_service_name": row.normalized_service_name,
            "category": row.category,
            "rate": float(row.rate) if row.rate is not None else None,
            "source_name": row.source_name,
            "source_url": row.source_url,
            "location": row.location,
            "applicability_notes": row.applicability_notes,
            "effective_from": str(row.effective_from) if row.effective_from else None,
            "effective_until": str(row.effective_until) if row.effective_until else None,
            "created_at": str(row.created_at) if row.created_at else None,
        }
