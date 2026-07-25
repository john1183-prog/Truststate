import os
import re
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

_RAW_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/trust_estate")

def _normalize_database_url(url: str) -> str:
    """
    Vercel's Neon integration injects DATABASE_URL as a bare postgresql:// string
    meant for sync drivers (psycopg2), which isn't installed here — we use asyncpg.
    That env var can also get silently re-synced back to Neon's raw value on a
    later deploy, undoing a manual dashboard edit. Fix it in code instead, so it
    can never regress no matter what raw string ends up in the environment.
    """
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    elif url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    # asyncpg doesn't understand ?sslmode=... the way psycopg2 does — strip it,
    # SSL is handled explicitly via connect_args below instead.
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    return url

DATABASE_URL = _normalize_database_url(_RAW_DATABASE_URL)
_is_local = "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL

_connect_args = {"statement_cache_size": 0}  # required for asyncpg + PgBouncer transaction pooling
if not _is_local:
    _connect_args["ssl"] = "require"  # Neon requires SSL; local Postgres typically doesn't have it configured

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    poolclass=NullPool,       # Neon's PgBouncer does the real pooling; don't double-pool
    pool_pre_ping=True,       # guards against a stale connection after Neon scales to zero
    connect_args=_connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    """Dependency to yield a database session."""
    async with AsyncSessionLocal() as session:
        yield session
