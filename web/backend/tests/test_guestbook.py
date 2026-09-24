from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_guestbook_full_flow():
    # 1. Fetch initial guestbook messages
    res = client.get("/api/guestbook")
    assert res.status_code == 200
    messages = res.json()
    assert isinstance(messages, list)

    # 2. Post new guestbook message
    payload = {
        "author_name": "Nguyễn Văn A",
        "content": "Chào Johnyyd! Giao diện chat portfolio này quá đỉnh!",
        "avatar_color": "#2563EB"
    }
    create_res = client.post("/api/guestbook", json=payload)
    assert create_res.status_code == 201
    created_msg = create_res.json()
    assert created_msg["author_name"] == "Nguyễn Văn A"
    assert created_msg["content"] == payload["content"]
    assert created_msg["likes_count"] == 0
    assert "id" in created_msg

    # 3. Like the newly posted message
    msg_id = created_msg["id"]
    like_res = client.post(f"/api/guestbook/{msg_id}/like")
    assert like_res.status_code == 200
    liked_msg = like_res.json()
    assert liked_msg["likes_count"] == 1

def test_guestbook_validation():
    # Empty author name should fail validation (422)
    invalid_payload = {
        "author_name": "",
        "content": "Test content",
        "avatar_color": "#2563EB"
    }
    res = client.post("/api/guestbook", json=invalid_payload)
    assert res.status_code == 422
