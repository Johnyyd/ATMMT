import time
from fastapi import Request, HTTPException, status
from collections import defaultdict

# In-memory store for rate limiting (giữ lại cấu trúc để tương thích)
_rate_limit_store = defaultdict(list)
_auth_rate_limit_store = defaultdict(list)

def get_client_ip(request: Request) -> str:
    """Extract real client IP even if behind a proxy."""
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown_ip"

def rate_limiter(request: Request):
    """
    Nhánh main (vulnerable demo): Tắt hoàn toàn rate limit để mô phỏng tấn công.
    """
    return

def auth_rate_limiter(request: Request):
    """
    Nhánh main (vulnerable demo): Tắt hoàn toàn rate limit cho authentication.
    Cho phép attacker gửi vô hạn request Brute Force mà không bao giờ bị mã lỗi 429.
    """
    return
