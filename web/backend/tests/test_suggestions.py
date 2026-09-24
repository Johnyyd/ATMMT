import pytest
from app.services.llm_service import parse_suggestions_from_reply
from app.services.suggestion_service import get_fallback_suggestions

def test_parse_suggestions_from_reply_extracts_cleanly():
    raw_reply = "Xin chào! Mình là Johnyyd AI.\n\n---SUGGESTIONS---\n[\"Kỹ năng chính là gì?\", \"Cách liên hệ Johnyyd?\"]"
    clean_reply, suggestions = parse_suggestions_from_reply(raw_reply)
    assert clean_reply == "Xin chào! Mình là Johnyyd AI."
    assert suggestions == ["Kỹ năng chính là gì?", "Cách liên hệ Johnyyd?"]

def test_get_fallback_suggestions_by_keyword():
    suggestions = get_fallback_suggestions("about", "Kinh nghiệm với Docker và Tailscale thế nào?")
    assert len(suggestions) >= 2
    assert any("Docker" in s or "Tailscale" in s for s in suggestions)
