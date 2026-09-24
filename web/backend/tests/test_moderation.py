import pytest
from app.services.moderation import censor_profanity

def test_censor_profanity_basic():
    text = "Xin chào vcl làm tốt lắm"
    censored = censor_profanity(text)
    assert censored == "Xin chào *** làm tốt lắm"

def test_censor_profanity_multiple():
    text = "địt mẹ cái này đm vkl"
    censored = censor_profanity(text)
    assert censored == "*** ** cái này ** ***"

def test_censor_profanity_english():
    text = "what the fuck is this shit"
    censored = censor_profanity(text)
    assert censored == "what the **** is this ****"

def test_censor_clean_text():
    text = "Xin chào bạn, tôi là người dùng mới"
    censored = censor_profanity(text)
    assert censored == text
