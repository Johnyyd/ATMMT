import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.schemas import UserCreate, UserPasswordUpdate
from app.models import User
from app.database import Base, get_db
from app.main import app

# In-memory SQLite for testing
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

def test_password_policy_enforcement():
    # Weak passwords must be rejected
    weak_passwords = [
        "short",           # < 8 chars
        "nouppercase1!",   # no uppercase
        "NOLOWERCASE1!",   # no lowercase
        "NoSpecialChar1",  # no special char
        "NoDigits!@#$",    # no digit
    ]
    for pw in weak_passwords:
        with pytest.raises(ValidationError):
            UserCreate(username="validuser", password=pw)
        with pytest.raises(ValidationError):
            UserPasswordUpdate(current_password="old", new_password=pw)

    # Strong password must succeed
    valid = UserCreate(username="validuser", password="StrongPass123!")
    assert valid.password == "StrongPass123!"

def test_user_model_has_lockout_fields():
    user = User(username="locktest", hashed_password="pw")
    assert hasattr(user, "failed_login_attempts")
    assert hasattr(user, "locked_until")
    assert user.failed_login_attempts == 0
    assert user.locked_until is None

def test_rate_limiter_rejects_testclient_backdoor():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.rate_limit import _auth_rate_limit_store
    _auth_rate_limit_store.clear()

    test_client = TestClient(app)
    # Attempt 5 times
    for _ in range(5):
        test_client.post("/api/v1/auth/token", data={"username": "fake", "password": "wrong"})
    # 6th attempt must be rejected with 429 Too Many Requests
    res = test_client.post("/api/v1/auth/token", data={"username": "fake", "password": "wrong"})
    assert res.status_code == 429
    assert "Quá nhiều yêu cầu" in res.json()["detail"] or "thử quá nhiều lần" in res.json()["detail"]
    _auth_rate_limit_store.clear()

def test_rate_limiter_ignores_spoofed_x_forwarded_for():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.rate_limit import _auth_rate_limit_store
    _auth_rate_limit_store.clear()

    test_client = TestClient(app)
    # Attempt 5 times with changing X-Forwarded-For headers
    for i in range(5):
        test_client.post(
            "/api/v1/auth/token",
            data={"username": "fake", "password": "wrong"},
            headers={"X-Forwarded-For": f"10.0.0.{i+1}"}
        )
    # 6th attempt with another spoofed IP must STILL be rate limited because untrusted headers are ignored
    res = test_client.post(
        "/api/v1/auth/token",
        data={"username": "fake", "password": "wrong"},
        headers={"X-Forwarded-For": "10.0.0.99"}
    )
    assert res.status_code == 429
    _auth_rate_limit_store.clear()
