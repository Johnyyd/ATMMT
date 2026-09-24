import pytest
from pydantic import ValidationError
from app.schemas import UserCreate, UserPasswordUpdate
from app.models import User

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
