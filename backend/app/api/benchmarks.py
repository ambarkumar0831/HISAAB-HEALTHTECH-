from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user, require_admin
from app.database.session import get_user_db
from app.services.benchmark_service import BenchmarkService
from app.models.schemas import BenchmarkRateBase, BenchmarkRateOut

router = APIRouter(prefix="/api/benchmarks", tags=["benchmarks"])


@router.get("", response_model=List[BenchmarkRateOut])
def list_benchmarks(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    svc = BenchmarkService(db)
    return svc.list_benchmarks()


@router.get("/{rate_id}", response_model=BenchmarkRateOut)
def get_benchmark(
    rate_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_user_db),
):
    svc = BenchmarkService(db)
    row = svc.get_benchmark(rate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return row


@router.post("", response_model=BenchmarkRateOut, status_code=status.HTTP_201_CREATED)
def create_benchmark(
    data: BenchmarkRateBase,
    user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_user_db),
):
    svc = BenchmarkService(db)
    return svc.create_benchmark(data.model_dump())


@router.put("/{rate_id}", response_model=BenchmarkRateOut)
def update_benchmark(
    rate_id: str,
    data: BenchmarkRateBase,
    user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_user_db),
):
    svc = BenchmarkService(db)
    row = svc.update_benchmark(rate_id, data.model_dump())
    if not row:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return row


@router.delete("/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_benchmark(
    rate_id: str,
    user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_user_db),
):
    svc = BenchmarkService(db)
    ok = svc.delete_benchmark(rate_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return None
