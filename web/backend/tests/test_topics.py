from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_topics_returns_topic_list():
    res = client.get("/api/topics")
    assert res.status_code == 200
    topics = res.json()
    assert len(topics) >= 3
    ids = [t["id"] for t in topics]
    assert "about" in ids
    assert "repos" in ids
    assert "guestbook" in ids

def test_get_topic_messages_success():
    res = client.get("/api/topics/about/messages")
    assert res.status_code == 200
    messages = res.json()
    assert len(messages) >= 4
    assert messages[0]["sender"] == "Johnyyd"

def test_get_topic_messages_not_found():
    res = client.get("/api/topics/nonexistent/messages")
    assert res.status_code == 404
