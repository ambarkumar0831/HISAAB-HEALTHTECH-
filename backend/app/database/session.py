import json

from fastapi import Depends
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session as OrmSession, sessionmaker

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"options": "-c timezone=utc"} if "postgres" in settings.DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


@event.listens_for(OrmSession, "after_begin")
def _set_postgres_auth_context(session, transaction, connection):
    user_id = session.info.get("auth_user_id")
    if not user_id or connection.dialect.name != "postgresql":
        return

    claims = session.info["auth_claims"]
    connection.exec_driver_sql("SET LOCAL ROLE authenticated")
    connection.execute(
        text("SELECT set_config('request.jwt.claim.sub', :user_id, true)"),
        {"user_id": user_id},
    )
    connection.execute(
        text("SELECT set_config('request.jwt.claims', :claims, true)"),
        {"claims": json.dumps(claims)},
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_db(
    user: AuthenticatedUser = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
):
    db.info["auth_user_id"] = user.id
    db.info["auth_claims"] = user.claims
    try:
        yield db
    finally:
        db.info.pop("auth_user_id", None)
        db.info.pop("auth_claims", None)
