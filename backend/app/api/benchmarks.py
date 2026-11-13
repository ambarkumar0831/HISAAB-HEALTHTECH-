from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.benchmark_service import BenchmarkService
from app.models.schemas import BenchmarkRateBase, BenchmarkRateOut

router = APIRouter(prefix="/api/benchmarks", tags=["benchmarks"])


@router.get("", response_model=List[BenchmarkRateOut])
def list_benchmarks(db: Session = Depends(get_db)):
    svc = BenchmarkService(db)
    return svc.list_benchmarks()


@router.get("/{rate_id}", response_model=BenchmarkRateOut)
def get_benchmark(rate_id: str, db: Session = Depends(get_db)):
    svc = BenchmarkService(db)
    row = svc.get_benchmark(rate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return row


@router.post("", response_model=BenchmarkRateOut, status_code=status.HTTP_201_CREATED)
def create_benchmark(data: BenchmarkRateBase, db: Session = Depends(get_db)):
    svc = BenchmarkService(db)
    return svc.create_benchmark(data.model_dump())


@router.put("/{rate_id}", response_model=BenchmarkRateOut)
def update_benchmark(rate_id: str, data: BenchmarkRateBase, db: Session = Depends(get_db)):
    svc = BenchmarkService(db)
    row = svc.update_benchmark(rate_id, data.model_dump())
    if not row:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return row


@router.delete("/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_benchmark(rate_id: str, db: Session = Depends(get_db)):
    svc = BenchmarkService(db)
    ok = svc.delete_benchmark(rate_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return None
