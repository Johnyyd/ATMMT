import os
import time
from fastapi import Request, HTTPException, status
from collections import defaultdict

# In-memory store for rate limiting: { "identifier": [timestamp1, timestamp2, ...] }
_rate_limit_store = defaultdict(list)
_auth_rate_limit_store = defaultdict(list)

def reset_rate_limits():
    """Reset all in-memory rate limit stores (useful for tests and administrative resets)."""
    _rate_limit_store.clear()
    _auth_rate_limit_store.clear()

def get_client_ip(request: Request) -> str:
    """
    Extract client IP securely.
    Do not trust spoofed client headers like X-Forwarded-For or X-Real-IP
    unless TRUST_PROXY_HEADERS is explicitly set to true in environment.
    """
    trust_proxy = os.getenv("TRUST_PROXY_HEADERS", "False").lower() in ("true", "1", "t")
    if trust_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return request.client.host if request.client else "unknown_ip"

def rate_limiter(request: Request):
    try:
        client_ip = get_client_ip(request)
        now = time.time()
        
        # Clean up timestamps older than 60 seconds
        _rate_limit_store[client_ip] = [ts for ts in _rate_limit_store[client_ip] if now - ts < 60]
        
        if len(_rate_limit_store[client_ip]) >= 10:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn gửi tin nhắn quá nhanh. Vui lòng chờ 1 phút để tiếp tục."
            )
        
        _rate_limit_store[client_ip].append(now)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

def auth_rate_limiter(request: Request):
    """
    Limits authentication requests to 5 per 15 minutes (900 seconds) per IP address.
    """
    client_ip = get_client_ip(request)
    now = time.time()
    
    _auth_rate_limit_store[client_ip] = [ts for ts in _auth_rate_limit_store[client_ip] if now - ts < 900]
    
    if len(_auth_rate_limit_store[client_ip]) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đã thử quá nhiều lần. Vui lòng chờ 15 phút để tiếp tục."
        )
    
    _auth_rate_limit_store[client_ip].append(now)
