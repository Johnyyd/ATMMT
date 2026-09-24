import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

client = TestClient(app)

def test_http_security_headers_present():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Server" not in resp.headers

def test_cors_rejects_untrusted_origins():
    # 1. Trusted origin receives allow header
    trusted_resp = client.get("/api/health", headers={"Origin": "https://chat.taild6d848.ts.net"})
    assert trusted_resp.status_code == 200
    assert trusted_resp.headers.get("Access-Control-Allow-Origin") == "https://chat.taild6d848.ts.net"

    # 2. Untrusted attacker origin does NOT receive allow header
    untrusted_resp = client.get("/api/health", headers={"Origin": "https://attacker-evil-domain.com"})
    assert untrusted_resp.status_code == 200
    assert "Access-Control-Allow-Origin" not in untrusted_resp.headers
