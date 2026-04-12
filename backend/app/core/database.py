from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import settings

_engine_kwargs: dict = {
    "pool_pre_ping": True,
}

if settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["poolclass"] = QueuePool
    _engine_kwargs["pool_size"] = 20
    _engine_kwargs["max_overflow"] = 40

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
