
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request, HTTPException, status

# Authentication rate limit configuration
AUTH_RATE_LIMIT = 10
AUTH_RATE_WINDOW = 60  # seconds

# Store request timestamps by client IP
_auth_rate_limit_store = defaultdict(deque)
_auth_rate_limit_lock = Lock()


def get_client_ip(request: Request) -> str:
    """
    Use the client IP provided by the ASGI server.

    Do not trust X-Forwarded-For or X-Real-IP directly.
    Proxy headers must be validated by trusted proxy
    configuration at the deployment layer.
    """
    return request.client.host if request.client else "unknown_ip"


def rate_limiter(request: Request):
    """
    General API rate limiting is outside the scope
    of this demonstration.
    """
    return


def auth_rate_limiter(request: Request):
    """
    Allow up to 10 authentication-related requests
    per client IP within a rolling 60-second window.
    """
    client_ip = get_client_ip(request)
    now = time.monotonic()

    with _auth_rate_limit_lock:
        attempts = _auth_rate_limit_store[client_ip]

        # Remove expired request timestamps
        while attempts and now - attempts[0] >= AUTH_RATE_WINDOW:
            attempts.popleft()

        if len(attempts) >= AUTH_RATE_LIMIT:
            retry_after = max(
                1, int(AUTH_RATE_WINDOW - (now - attempts[0])) + 1
            )

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Quá nhiều yêu cầu. Vui lòng thử lại sau.",
                headers={"Retry-After": str(retry_after)}
            )

        attempts.append(now)
