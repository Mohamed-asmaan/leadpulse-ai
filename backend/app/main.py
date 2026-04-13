"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}
