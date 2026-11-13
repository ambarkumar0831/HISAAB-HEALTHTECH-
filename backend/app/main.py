from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import audits, benchmarks, dashboard
from app.database.session import Base, engine

# Create tables (for MVP SQLite/Postgres; replace with Alembic migrations later)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HISAAB — Audit the Hospital Bill", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audits.router)
app.include_router(benchmarks.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"name": "HISAAB", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
