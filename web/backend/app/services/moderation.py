import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Comprehensive list of Vietnamese and English profane, vulgar, 18+, and toxic terms
PROFANITY_WORDS = [
    # Vietnamese vulgarities, swearing & 18+ terms
    r"đm", r"đcm", r"dcm", r"dm", r"vcl", r"vkl", r"vl", r"cl", r"cc",
    r"cặc", r"cac", r"lồn", r"lon", r"buồi", r"buoi", r"dái", r"dai",
    r"địt", r"dit", r"chịch", r"chich", r"phịch", r"phich", r"dâm", r"dam",
    r"đéo", r"deo", r"đái", r"dai", r"ỉa", r"ia", r"vú", r"bóp vú", r"sờ ti",
    r"đấu kiếm", r"bắn tinh", r"dâm dục", r"khiêu dâm", r"người lớn", r"18\+",
    r"hiếp", r"hãm hiếp", r"loạn luân", r"gái gọi", r"cave", r"phò", r"bán dâm",
    r"vãi", r"đếch", r"mẹ", r"mẹ kiếp", r"chó đẻ", r"đồ chó",
    # English vulgarities, swearing & 18+ terms
    r"fuck", r"fucking", r"fucker", r"shit", r"bitch", r"cunt", r"dick",
    r"pussy", r"cock", r"porn", r"porno", r"nude", r"sex", r"sexual", r"bastard",
    r"asshole", r"ass", r"whore", r"slut"
]

pattern_str = r"(?i)\b(" + "|".join(PROFANITY_WORDS) + r")\b"
PROFANITY_REGEX = re.compile(pattern_str, re.IGNORECASE | re.UNICODE)

def censor_profanity(text: Optional[str]) -> str:
    """
    Replaces profane, vulgar, offensive, and 18+ words in text with '*' matching exact character length.
    Examples:
      - 'vcl' -> '***'
      - 'fuck' -> '****'
      - 'địt' -> '***'
    """
    if not text:
        return ""

    def mask_match(match: re.Match) -> str:
        word = match.group(0)
        return "*" * len(word)

    censored = PROFANITY_REGEX.sub(mask_match, text)
    return censored
