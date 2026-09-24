import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import GuestbookMessage, User
from app.security import get_password_hash
from app.services.cleanup import purge_expired_anonymous_messages
from app.crypto import public_key
import os
import json
import base64
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

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

client = TestClient(app)

def encrypt_test_payload(payload: dict) -> dict:
    aes_key = os.urandom(32)
    iv = os.urandom(12)
    json_str = json.dumps(payload).encode('utf-8')
    cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(json_str) + encryptor.finalize()
    tag = encryptor.tag
    full_payload = iv + ciphertext + tag
    payload_b64 = base64.b64encode(full_payload).decode('utf-8')
    
    encrypted_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    encrypted_key_b64 = base64.b64encode(encrypted_key).decode('utf-8')
    return {"encrypted_key": encrypted_key_b64, "payload": payload_b64}

def test_user_registration_and_login():
    # Public registration ALWAYS creates a regular 'user' account
    reg_resp = client.post("/api/v1/auth/register", json=encrypt_test_payload({
        "username": "testuser",
        "password": "Password123!"
    }))
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" not in data
    assert data["user"]["username"] == "testuser"
    assert data["user"]["role"] == "user"

    # Login user
    login_resp = client.post("/api/v1/auth/login", json=encrypt_test_payload({
        "username": "testuser",
        "password": "Password123!"
    }))
    assert login_resp.status_code == 200
    
    # Extract token from cookies for the test client
    token = login_resp.cookies.get("access_token")
    assert token is not None

    # Get /me with Cookie
    me_resp = client.get("/api/v1/auth/me", cookies={"access_token": token})
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "testuser"

def test_guestbook_message_expiration_roles():
    # 1. Anonymous post -> should set expires_at (~30 days)
    anon_resp = client.post("/api/v1/guestbook", json={
        "author_name": "AnonGuest",
        "content": "Tin nhắn vãng lai"
    })
    assert anon_resp.status_code == 201
    anon_data = anon_resp.json()
    assert anon_data["author_role"] == "anonymous"
    assert anon_data["user_id"] is None
    assert anon_data["expires_at"] is not None

    # 2. Registered user post -> expires_at should be None (permanent retention)
    reg_resp = client.post("/api/v1/auth/register", json=encrypt_test_payload({
        "username": "member1",
        "password": "Password123!"
    }))
    reg_user_token = reg_resp.cookies.get("access_token")

    user_post = client.post("/api/v1/guestbook", json={
        "author_name": "ShouldBeOverridden",
        "content": "Tin nhắn thành viên chính thức"
    }, cookies={"access_token": reg_user_token})
    assert user_post.status_code == 201
    user_data = user_post.json()
    assert user_data["author_name"] == "member1"
    assert user_data["author_role"] == "user"
    assert user_data["user_id"] is not None
    assert user_data["expires_at"] is None

def test_admin_edit_and_delete_moderation():
    # Create an anonymous message
    post_resp = client.post("/api/v1/guestbook", json={
        "author_name": "BadActor",
        "content": "Nội dung nhạy cảm vô văn hóa"
    })
    msg_id = post_resp.json()["id"]

    # Create admin user directly in DB (simulating seed/DB admin creation)
    db = TestingSessionLocal()
    admin_user = User(
        username="sysadmin",
        hashed_password=get_password_hash("AdminPassword123!"),
        role="admin"
    )
    db.add(admin_user)
    db.commit()
    db.close()

    # Admin login
    admin_token = client.post("/api/v1/auth/login", json=encrypt_test_payload({
        "username": "sysadmin",
        "password": "AdminPassword123!"
    })).cookies.get("access_token")

    # Public regular user register & login
    user_token = client.post("/api/v1/auth/register", json=encrypt_test_payload({
        "username": "normie",
        "password": "UserPassword123!"
    })).cookies.get("access_token")

    # Regular user attempts to edit -> 403 Forbidden
    edit_by_user = client.put(f"/api/v1/guestbook/{msg_id}", json={
        "content": "User try edit"
    }, cookies={"access_token": user_token})
    assert edit_by_user.status_code == 403

    # Admin edits message -> Success
    edit_by_admin = client.put(f"/api/v1/guestbook/{msg_id}", json={
        "content": "[Tin nhắn đã được Admin chỉnh sửa lại cho phù hợp]"
    }, cookies={"access_token": admin_token})
    assert edit_by_admin.status_code == 200
    assert edit_by_admin.json()["is_edited"] is True
    assert "[Tin nhắn đã được Admin" in edit_by_admin.json()["content"]

    # Regular user attempts delete -> 403 Forbidden
    del_by_user = client.delete(f"/api/v1/guestbook/{msg_id}", cookies={"access_token": user_token})
    assert del_by_user.status_code == 403

    # Admin deletes message -> Success
    del_by_admin = client.delete(f"/api/v1/guestbook/{msg_id}", cookies={"access_token": admin_token})
    assert del_by_admin.status_code == 200

def test_30_day_purge_service():
    db = TestingSessionLocal()
    now = datetime.utcnow()
    old_date = now - timedelta(days=31)

    # Message 1: Anonymous message older than 30 days -> Should be purged
    old_anon_msg = GuestbookMessage(
        author_name="OldAnon",
        content="Tiny message",
        user_id=None,
        created_at=old_date,
        expires_at=old_date + timedelta(days=30)
    )
    # Message 2: Registered user message older than 30 days -> Should NOT be purged
    user = User(username="oldmember", hashed_password="pw", role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    old_user_msg = GuestbookMessage(
        author_name="oldmember",
        content="Important member post",
        user_id=user.id,
        created_at=old_date,
        expires_at=None
    )
    db.add_all([old_anon_msg, old_user_msg])
    db.commit()

    # Run purge
    deleted_count = purge_expired_anonymous_messages(db)
    assert deleted_count == 1

    remaining = db.query(GuestbookMessage).all()
    assert len(remaining) == 1
    assert remaining[0].author_name == "oldmember"
    db.close()
