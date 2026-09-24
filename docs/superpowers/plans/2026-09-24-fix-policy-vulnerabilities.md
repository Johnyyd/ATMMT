# Fix Policy Vulnerabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild and harden the application on branch `fix_policy` to eliminate all reconnaissance and brute force vulnerabilities present on branch `main` (Account Lockout, Password Complexity, Rate Limit Bypass, Timing Attacks, IDOR, OpenAPI Leakage, and Data Exposure).

**Architecture:** Add `failed_login_attempts` and `locked_until` columns to the `User` model, enforce 5-failure/15-minute account lockout with HTTP 403 response on both `/login` and `/token`, mitigate timing attacks using dummy hash comparison, harden rate limiting to ignore spoofed `X-Forwarded-For` and eliminate the `testclient` backdoor, protect user profile endpoints against unauthenticated IDOR, sanitize responses to prevent sensitive data exposure, and gate Swagger/OpenAPI documentation.

**Tech Stack:** FastAPI, SQLAlchemy ORM, SQLite, Pydantic v2, Bcrypt, PyJWT, Starlette TestClient, React 18, Vite.

**Spec:** [docs/HUONG_DAN_DU_AN_BRUTE_FORCE.md](file:///home/tringuyen/Documents/GitHub/ATMMT/docs/HUONG_DAN_DU_AN_BRUTE_FORCE.md)

## Global Constraints

- Backend must run on Python 3.14 with FastAPI and SQLAlchemy without syntax or import errors.
- All 16 existing backend pytest tests and 11 frontend Vitest tests must pass without regressions.
- Password complexity must enforce: $\ge 8$ chars, at least 1 lowercase, 1 uppercase, 1 digit, and 1 special symbol.
- Lockout policy: Maximum 5 consecutive failed login attempts locks account for 15 minutes, returning HTTP 403 Forbidden.
- Rate limiting must strictly prevent spoofing via client-provided headers and remove test backdoors.
- Responses from `/api/users/{user_id}` must require authentication (`get_current_user`) to prevent IDOR reconnaissance.
- Zero placeholder or TODO comments in production code.

---

### Task 1: Update Database Model and Validation Schemas

**Files:**
- Modify: `web/backend/app/models.py:9-24`
- Modify: `web/backend/app/schemas.py:5-15, 41-45, 60-76`
- Modify: `web/backend/tests/test_auth_and_moderation.py:70-97, 110-180`
- Test: `web/backend/tests/test_security_hardening.py`

**Interfaces:**
- Consumes: SQLAlchemy `Column`, `Integer`, `DateTime`; Pydantic `field_validator`, `BaseModel`
- Produces: `User.failed_login_attempts`, `User.locked_until`, `validate_password_complexity` validator on `UserCreate` and `UserPasswordUpdate`

- [ ] **Step 1: Write failing test for password policy and model fields**

Create `web/backend/tests/test_security_hardening.py`:
```python
import pytest
from pydantic import ValidationError
from app.schemas import UserCreate, UserPasswordUpdate
from app.models import User

def test_password_policy_enforcement():
    # Weak passwords should raise ValidationError
    weak_passwords = ["short", "nouppercase1!", "NOLOWERCASE1!", "NoSpecialChar1", "NoDigits!@#$"]
    for pw in weak_passwords:
        with pytest.raises(ValidationError):
            UserCreate(username="validuser", password=pw)
        with pytest.raises(ValidationError):
            UserPasswordUpdate(current_password="old", new_password=pw)

    # Strong password should pass
    valid = UserCreate(username="validuser", password="StrongPass123!")
    assert valid.password == "StrongPass123!"

def test_user_model_has_lockout_fields():
    user = User(username="locktest", hashed_password="pw")
    assert hasattr(user, "failed_login_attempts")
    assert hasattr(user, "locked_until")
    assert user.failed_login_attempts == 0
    assert user.locked_until is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py -v`
Expected: FAIL with `ValidationError` not raised or missing attribute.

- [ ] **Step 3: Implement minimal code in models.py and schemas.py**

In `web/backend/app/models.py`:
Add to `User` class:
```python
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
```

In `web/backend/app/schemas.py`:
Add password complexity validator:
```python
import re
from pydantic import field_validator

def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Mật khẩu phải có tối thiểu 8 ký tự.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ số.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.")
    return v
```
Wire to `UserCreate` and `UserPasswordUpdate`:
```python
    @field_validator("password")
    @classmethod
    def check_password_complexity(cls, v: str) -> str:
        return validate_password_strength(v)
```
Update `test_auth_and_moderation.py` passwords to comply with `"Password123!"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py tests/test_auth_and_moderation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/backend/app/models.py web/backend/app/schemas.py web/backend/tests/
git commit -m "feat(security): add lockout fields to User and enforce strong password policy"
```

---

### Task 2: Harden Rate Limiter Against Header Spoofing and Backdoors

**Files:**
- Modify: `web/backend/app/rate_limit.py:1-67`
- Test: `web/backend/tests/test_security_hardening.py`

**Interfaces:**
- Consumes: Starlette `Request`, `HTTPException`
- Produces: `get_client_ip(request: Request) -> str`, `reset_rate_limits()` helper for clean test runs, `auth_rate_limiter` without backdoor.

- [ ] **Step 1: Write failing test for rate limit bypass resistance**

In `web/backend/tests/test_security_hardening.py`:
```python
from fastapi.testclient import TestClient
from app.main import app
from app.rate_limit import reset_rate_limits, _auth_rate_limit_store

client = TestClient(app)

def test_rate_limiter_rejects_testclient_backdoor():
    reset_rate_limits()
    # Sending X-Forwarded-For: testclient must NOT bypass rate limiter
    for _ in range(5):
        client.post("/api/v1/auth/token", data={"username": "fake", "password": "wrong"}, headers={"X-Forwarded-For": "testclient"})
    # 6th request must trigger 429
    res = client.post("/api/v1/auth/token", data={"username": "fake", "password": "wrong"}, headers={"X-Forwarded-For": "testclient"})
    assert res.status_code == 429
    assert "Quá nhiều yêu cầu" in res.json()["detail"] or "thử quá nhiều lần" in res.json()["detail"]
    reset_rate_limits()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py::test_rate_limiter_rejects_testclient_backdoor -v`
Expected: FAIL (status_code is 401 instead of 429 because `testclient` bypassed rate limiting).

- [ ] **Step 3: Implement rate_limit.py hardening**

In `web/backend/app/rate_limit.py`:
- Remove `if client_ip == "testclient": return`
- Do not blindly accept arbitrary `X-Forwarded-For` from untrusted callers. Extract client host safely:
```python
def get_client_ip(request: Request) -> str:
    # Do not blindly trust spoofed headers unless trusted proxy is configured
    trusted_proxy = os.getenv("TRUST_PROXY_HEADERS", "False").lower() in ("true", "1", "t")
    if trusted_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return request.client.host if request.client else "unknown_ip"
```
- Provide `reset_rate_limits()` helper to allow tests to reset state cleanly.

- [ ] **Step 4: Run test to verify it passes**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py::test_rate_limiter_rejects_testclient_backdoor -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/backend/app/rate_limit.py web/backend/tests/
git commit -m "fix(security): remove rate limit backdoor and prevent header spoofing"
```

---

### Task 3: Implement Account Lockout and Timing Attack Defense in Auth Router

**Files:**
- Modify: `web/backend/app/routers/auth.py:1-100`
- Test: `web/backend/tests/test_security_hardening.py`

**Interfaces:**
- Consumes: `User.failed_login_attempts`, `User.locked_until`, `MAX_FAILED_ATTEMPTS=5`, `LOCKOUT_DURATION_MINUTES=15`
- Produces: 403 Forbidden with lockout notification after 5 failed attempts; dummy Bcrypt verification for non-existent users.

- [ ] **Step 1: Write failing tests for Account Lockout and Timing Defense**

In `web/backend/tests/test_security_hardening.py`:
```python
import time
from app.database import SessionLocal
from app.models import User
from app.security import get_password_hash

def test_account_lockout_after_five_failed_attempts():
    reset_rate_limits()
    db = SessionLocal()
    target_user = User(
        username="target_victim",
        hashed_password=get_password_hash("TargetPass123!"),
        role="user"
    )
    db.add(target_user)
    db.commit()

    # 5 failed attempts with wrong password
    for i in range(5):
        resp = client.post("/api/v1/auth/token", data={"username": "target_victim", "password": f"wrong_{i}"})
        if i < 4:
            assert resp.status_code == 401
        else:
            assert resp.status_code == 403
            assert "tạm khóa" in resp.json()["detail"]

    # 6th attempt even with correct password must be locked (403)
    resp = client.post("/api/v1/auth/token", data={"username": "target_victim", "password": "TargetPass123!"})
    assert resp.status_code == 403
    assert "tạm khóa" in resp.json()["detail"]

    # Cleanup
    db.delete(target_user)
    db.commit()
    db.close()
    reset_rate_limits()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py::test_account_lockout_after_five_failed_attempts -v`
Expected: FAIL (status_code is 401 on 5th attempt, no lockout).

- [ ] **Step 3: Implement Account Lockout & Constant Time Defense in auth.py**

In `web/backend/app/routers/auth.py`:
Define:
```python
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
DUMMY_PASSWORD_HASH = get_password_hash("dummy_constant_time_pass_for_enumeration_defense")
```
Implement lockout checking and failed attempt tracking in both `/login` and `/token`:
- If `user.locked_until`:
  - If `now < user.locked_until`: raise HTTP 403 Forbidden with lockout time.
  - Else: reset `locked_until = None` and `failed_login_attempts = 0`.
- If `user is None`: run `verify_password(password, DUMMY_PASSWORD_HASH)` to preserve constant execution time.
- If password incorrect:
  - Increment `user.failed_login_attempts += 1`.
  - If `user.failed_login_attempts >= MAX_FAILED_ATTEMPTS`:
    - Set `user.locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)`.
    - Commit and raise HTTP 403 Forbidden.
  - Commit and raise HTTP 401 Unauthorized.
- If password correct:
  - Reset `failed_login_attempts = 0`, `locked_until = None`.
  - Issue JWT token and HTTP 200 OK.

- [ ] **Step 4: Run test to verify it passes**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py::test_account_lockout_after_five_failed_attempts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/backend/app/routers/auth.py web/backend/tests/
git commit -m "feat(security): implement account lockout after 5 failures and timing attack defense"
```

---

### Task 4: Fix IDOR Vulnerability and Sensitive Data Exposure

**Files:**
- Modify: `web/backend/app/routers/users.py:27-39`
- Modify: `web/backend/app/routers/guestbook.py:92-111`
- Test: `web/backend/tests/test_security_hardening.py`

**Interfaces:**
- Consumes: `get_current_user` dependency from `app.security`
- Produces: Protected `GET /users/{user_id}` requiring authentication; sanitized `GuestbookResponse` masking sensitive tokens and private IDs.

- [ ] **Step 1: Write failing test for IDOR access control**

In `web/backend/tests/test_security_hardening.py`:
```python
def test_users_endpoint_requires_auth_preventing_idor():
    # Anonymous request to /users/1 must be rejected with 401 Unauthorized
    resp = client.get("/api/v1/users/1")
    assert resp.status_code == 401

def test_guestbook_does_not_leak_user_token_in_public_feed():
    post_res = client.post("/api/v1/guestbook", json={
        "author_name": "SecretTester",
        "content": "Message content",
        "user_token": "secret_private_token_xyz"
    })
    assert post_res.status_code == 201

    get_res = client.get("/api/v1/guestbook")
    assert get_res.status_code == 200
    for item in get_res.json():
        assert item.get("user_token") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py::test_users_endpoint_requires_auth_preventing_idor -v`
Expected: FAIL (returns 200/404 instead of 401 because `current_user` dependency was missing).

- [ ] **Step 3: Implement protection in users.py and guestbook.py**

In `web/backend/app/routers/users.py`:
Add `current_user: User = Depends(get_current_user)` to `get_user`:
```python
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
```

In `web/backend/app/routers/guestbook.py`:
Sanitize `build_guestbook_response`:
```python
def build_guestbook_response(msg: GuestbookMessage) -> GuestbookResponse:
    author_role = "anonymous"
    if msg.user:
        author_role = msg.user.role

    return GuestbookResponse(
        id=msg.id,
        author_name=msg.author_name,
        content=msg.content,
        avatar_color=msg.avatar_color,
        likes_count=msg.likes_count,
        created_at=msg.created_at,
        user_token=None,  # Never leak internal/client tokens in public feeds
        user_id=msg.user_id,
        is_edited=msg.is_edited or False,
        edited_at=msg.edited_at,
        expires_at=msg.expires_at,
        image=msg.image,
        author_role=author_role
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests/test_security_hardening.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/backend/app/routers/users.py web/backend/app/routers/guestbook.py web/backend/tests/
git commit -m "fix(security): protect user profile endpoint against IDOR and sanitize guestbook feeds"
```

---

### Task 5: Gate Swagger/OpenAPI Documentation and Hardened Environment Defaults

**Files:**
- Modify: `web/backend/app/config.py:1-9`
- Modify: `web/backend/app/main.py:61-68`
- Modify: `web/backend/app/main.py:23-45`
- Test: `web/backend/tests/test_security_hardening.py`

**Interfaces:**
- Consumes: `settings.ENABLE_SWAGGER`, `settings.ADMIN_PASSWORD`
- Produces: Conditional OpenAPI/docs endpoints based on `ENABLE_SWAGGER` environment configuration; strong fallback admin password.

- [ ] **Step 1: Write failing test for Swagger gating**

In `web/backend/tests/test_security_hardening.py`:
```python
def test_swagger_docs_can_be_disabled_in_production(monkeypatch):
    from app.config import Settings
    custom_settings = Settings(ENABLE_SWAGGER=False)
    assert custom_settings.ENABLE_SWAGGER is False
```

- [ ] **Step 2: Implement configuration and main.py updates**

In `web/backend/app/config.py`:
```python
import os

class Settings:
    PROJECT_NAME: str = "Chat-style Portfolio & Guestbook API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./guestbook.db")
    ENABLE_SWAGGER: bool = os.getenv("ENABLE_SWAGGER", "False").lower() in ("true", "1", "t")

settings = Settings()
```

In `web/backend/app/main.py`:
```python
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json" if settings.ENABLE_SWAGGER else None,
    docs_url="/docs" if settings.ENABLE_SWAGGER else None,
    redoc_url="/redoc" if settings.ENABLE_SWAGGER else None,
    lifespan=lifespan,
    debug=os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
)
```
In `seed_default_admin()`:
Use secure random password or strong default (`Admin@2026!SecurePass`) instead of trivial `admin123`.

- [ ] **Step 3: Run full backend and frontend test suite**

Run: `JWT_SECRET_KEY=testsecretkey pytest tests -v`
Run: `npm test -- --run` in `web/frontend`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add web/backend/app/config.py web/backend/app/main.py
git commit -m "feat(security): gate Swagger UI documentation and secure default admin initialization"
```

---

### Task 6: End-to-End OWASP Security Hardening Verification

**Files:**
- Execute verification commands across all OWASP categories tested:
  1. A01 Broken Access Control: IDOR check on `/api/users/1`
  2. A02 Security Misconfiguration: Swagger gating and header spoofing
  3. A03 Excessive Data Exposure: Sanitized token responses
  4. A07 Authentication Failures: Account lockout (5 attempts $\rightarrow$ 403), Timing attack resistance, Strong password validator

- [ ] **Step 1: Execute all pytest suites**
- [ ] **Step 2: Execute frontend Vitest test suite**
- [ ] **Step 3: Verify clean git status and commit history**
- [ ] **Step 4: Output completion audit**
