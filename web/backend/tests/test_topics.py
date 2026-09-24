from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_topics_returns_topic_list():
    res = client.get("/api/topics")
    assert res.status_code == 200
    topics = res.json()
    assert len(topics) == 1
    assert topics[0]["id"] == "guestbook"

def test_get_topic_messages_guestbook():
    res = client.get("/api/topics/guestbook/messages")
    assert res.status_code == 200
    messages = res.json()
    assert isinstance(messages, list)

def test_get_topic_messages_not_found():
    res = client.get("/api/topics/nonexistent/messages")
    assert res.status_code == 404

