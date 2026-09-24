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

def test_account_lockout_after_five_failed_attempts():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.rate_limit import reset_rate_limits
    from app.security import get_password_hash

    reset_rate_limits()
    db = TestingSessionLocal()
    target_user = User(
        username="target_victim",
        hashed_password=get_password_hash("VictimPass123!"),
        role="user"
    )
    db.add(target_user)
    db.commit()

    test_client = TestClient(app)

    # 4 failed attempts should yield 401 Unauthorized
    for i in range(4):
        reset_rate_limits()
        resp = test_client.post("/api/v1/auth/token", data={"username": "target_victim", "password": f"wrong_{i}"})
        assert resp.status_code == 401, f"Attempt {i+1} should be 401, got {resp.status_code}"

    # 5th failed attempt should trigger account lockout (403 Forbidden)
    reset_rate_limits()
    resp5 = test_client.post("/api/v1/auth/token", data={"username": "target_victim", "password": "wrong_final"})
    assert resp5.status_code == 403, f"5th attempt should be 403, got {resp5.status_code}"
    assert "tạm khóa" in resp5.json()["detail"] or "locked" in resp5.json()["detail"].lower()

    # 6th attempt with CORRECT password must STILL be rejected with 403 because account is locked
    reset_rate_limits()
    resp6 = test_client.post("/api/v1/auth/token", data={"username": "target_victim", "password": "VictimPass123!"})
    assert resp6.status_code == 403
    assert "tạm khóa" in resp6.json()["detail"] or "locked" in resp6.json()["detail"].lower()

    db.delete(target_user)
    db.commit()
    db.close()
    reset_rate_limits()

def test_account_lockout_expires_and_resets():
    from datetime import datetime, timedelta
    from fastapi.testclient import TestClient
    from app.main import app
    from app.rate_limit import reset_rate_limits
    from app.security import get_password_hash

    reset_rate_limits()
    db = TestingSessionLocal()
    # Create user with locked_until in the PAST (lock expired)
    past_time = datetime.utcnow() - timedelta(minutes=1)
    user = User(
        username="expired_lock_user",
        hashed_password=get_password_hash("ValidPass123!"),
        role="user",
        failed_login_attempts=5,
        locked_until=past_time
    )
    db.add(user)
    db.commit()

    test_client = TestClient(app)
    # Login with correct password after lock expiration -> should succeed (200)
    resp = test_client.post("/api/v1/auth/token", data={"username": "expired_lock_user", "password": "ValidPass123!"})
    assert resp.status_code == 200
    assert "user" in resp.json()

    # DB record should be reset
    db.refresh(user)
    assert user.locked_until is None
    assert user.failed_login_attempts == 0

    db.delete(user)
    db.commit()
    db.close()
    reset_rate_limits()

def test_login_success_resets_failed_counter():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.rate_limit import reset_rate_limits
    from app.security import get_password_hash

    reset_rate_limits()
    db = TestingSessionLocal()
    user = User(
        username="counter_user",
        hashed_password=get_password_hash("CounterPass123!"),
        role="user"
    )
    db.add(user)
    db.commit()

    test_client = TestClient(app)

    # 2 failed attempts
    for _ in range(2):
        reset_rate_limits()
        test_client.post("/api/v1/auth/token", data={"username": "counter_user", "password": "bad"})

    db.refresh(user)
    assert user.failed_login_attempts == 2

    # Successful login
    reset_rate_limits()
    resp = test_client.post("/api/v1/auth/token", data={"username": "counter_user", "password": "CounterPass123!"})
    assert resp.status_code == 200

    # Counter should be reset to 0
    db.refresh(user)
    assert user.failed_login_attempts == 0

    db.delete(user)
    db.commit()
    db.close()
    reset_rate_limits()
