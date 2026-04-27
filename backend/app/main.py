"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager
from time import monotonic
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.bootstrap.users import ensure_seed_users
from app.core.config import settings
from app.core.database import engine
from app.models import Base


def _cors_config() -> tuple[list[str], bool]:
    raw = (settings.CORS_ALLOW_ORIGINS or "").strip()
    if not raw or raw == "*":
        return ["*"], False
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        return ["*"], False
    return origins, True


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_seed_users()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

_allow_origins, _allow_credentials = _cors_config()
_ip_windows: dict[str, deque[float]] = defaultdict(deque)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    # Basic body-size guard before downstream handlers parse JSON payloads.
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(status_code=413, content={"detail": "Request body too large"})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})

    # Lightweight per-IP rate limit. For distributed deployments, replace with Redis.
    ip = request.client.host if request.client else "unknown"
    now = monotonic()
    window = _ip_windows[ip]
    while window and (now - window[0]) > 60:
        window.popleft()
    limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE + settings.RATE_LIMIT_BURST_ALLOWANCE
    if len(window) >= limit:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Retry shortly."},
            headers={"Retry-After": "60"},
        )
    window.append(now)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-XSS-Protection", "0")
    response.headers.setdefault("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")
    if settings.ENABLE_HSTS:
        response.headers.setdefault("Strict-Transport-Security", f"max-age={settings.HSTS_MAX_AGE_SECONDS}; includeSubDomains")
    return response

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}
