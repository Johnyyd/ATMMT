import os
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_columns(target_engine=engine):
    """Ensure all required columns exist in database even if migrated from older versions."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(target_engine)
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            with target_engine.begin() as conn:
                if "failed_login_attempts" not in columns:
                    logger.info("Auto-migrating schema: adding failed_login_attempts to users table")
                    conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"))
                if "locked_until" not in columns:
                    logger.info("Auto-migrating schema: adding locked_until to users table")
                    conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))
    except Exception as e:
        logger.warning(f"ensure_schema_columns skipped or failed: {e}")

