"""Security headers + a lightweight in-memory rate limiter for auth endpoints."""
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

# Auth endpoints worth protecting from brute force / credential stuffing.
SENSITIVE_PATHS = {
    "/auth/login",
    "/auth/signup",
    "/auth/refresh",
    "/auth/change-password",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add standard hardening headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
        # HSTS only matters over HTTPS; enable it in production.
        if settings.ENVIRONMENT == "production":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Fixed-window per-IP rate limit on sensitive auth POSTs. In-memory and
    per-process — fine for a single instance.
    TODO: back with Redis (or a shared store) for multi-instance deployments,
    and read the client IP from X-Forwarded-For when running behind a proxy.
    """

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[tuple[str, str], list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if (
            settings.RATE_LIMIT_ENABLED
            and request.method == "POST"
            and request.url.path in SENSITIVE_PATHS
        ):
            ip = request.client.host if request.client else "unknown"
            key = (ip, request.url.path)
            now = time.monotonic()
            window = settings.RATE_LIMIT_WINDOW_SECONDS
            limit = settings.RATE_LIMIT_MAX_REQUESTS

            recent = [t for t in self._hits[key] if now - t < window]
            if len(recent) >= limit:
                retry_after = int(window - (now - recent[0])) + 1
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down and try again."},
                    headers={"Retry-After": str(retry_after)},
                )
            recent.append(now)
            self._hits[key] = recent

        return await call_next(request)
