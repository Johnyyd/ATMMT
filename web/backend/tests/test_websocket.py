import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rate_limit import reset_rate_limits

@pytest.fixture(autouse=True)
def clean_rate_limits():
    reset_rate_limits()
    yield
    reset_rate_limits()

client = TestClient(app)

def test_websocket_connection_and_ping():
    with client.websocket_connect("/api/guestbook/ws") as websocket:
        init_msg = websocket.receive_json()
        assert init_msg["event"] == "online_count"
        assert init_msg["count"] >= 1

        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"

def test_websocket_broadcast_on_post():
    with client.websocket_connect("/api/guestbook/ws") as websocket:
        init_msg = websocket.receive_json()
        assert init_msg["event"] == "online_count"

        # Create a message via REST
        res = client.post("/api/guestbook", json={
            "author_name": "Tester WS",
            "content": "Testing real-time broadcast",
            "avatar_color": "#10B981",
            "user_token": "usr_token_test_123"
        })
        assert res.status_code == 201

        # Receive real-time broadcast message from WebSocket
        ws_msg = websocket.receive_json()
        assert ws_msg["event"] == "new_message"
        assert ws_msg["data"]["author_name"] == "Tester WS"
        assert ws_msg["data"]["user_token"] == "usr_token_test_123"
