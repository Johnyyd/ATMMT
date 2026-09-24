from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chat_endpoint_validation_and_response(monkeypatch):
    from app.routers.chat import llm_service

    async def mock_generate(conversation_history, provider):
        return {
            "reply": "Xin chào! Đây là phản hồi thử nghiệm từ AI Johnyyd.",
            "provider_used": "openrouter",
            "model_used": "nvidia/nemotron-3-ultra-550b-a55b:free"
        }

    monkeypatch.setattr(llm_service, "generate_response", mock_generate)

    response = client.post(
        "/api/chat",
        json={
            "message": "Xin chào, Johnyyd!",
            "history": [{"role": "user", "content": "Hi"}],
            "provider": "auto"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "reply" in data["data"]
    assert data["data"]["reply"] == "Xin chào! Đây là phản hồi thử nghiệm từ AI Johnyyd."
    assert data["data"]["provider_used"] == "openrouter"
