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

def test_public_user_profile_does_not_expose_role():
    from app.models import User
    from app.security import get_password_hash, create_access_token

    db = TestingSessionLocal()
    alice = User(
        username="alice_admin",
        hashed_password=get_password_hash("AdminPass123!"),
        role="admin"
    )
    bob = User(
        username="bob_user",
        hashed_password=get_password_hash("UserPass123!"),
        role="user"
    )
    db.add_all([alice, bob])
    db.commit()
    db.refresh(alice)
    db.refresh(bob)
    alice_id = alice.id
    db.close()

    bob_token = create_access_token({"sub": "bob_user"})
    alice_token = create_access_token({"sub": "alice_admin"})

    # Bob fetches Alice's public profile via GET /users/{alice.id}
    res = client.get(f"/api/v1/users/{alice_id}", cookies={"access_token": bob_token})
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "alice_admin"
    assert data["id"] == alice_id
    # CRITICAL: "role" MUST NOT be exposed in public user profile
    assert "role" not in data

    # Alice fetches her own profile via GET /users/me/profile
    me_res = client.get("/api/v1/users/me/profile", cookies={"access_token": alice_token})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["role"] == "admin"

