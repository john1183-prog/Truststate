import os
import re
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

_RAW_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/trust_estate")

def _normalize_database_url(url: str) -> str:
    """
    Neon injects DATABASE_URL with sync-driver prefixes and query params
    (sslmode, channel_binding) that asyncpg does not support.
    Strip the entire query string and force the asyncpg driver prefix.
    """
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    elif url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]

    # Strip everything after ? — asyncpg handles SSL via connect_args, not URL params
    url = re.sub(r"\?.*$", "", url)
    return url

DATABASE_URL = _normalize_database_url(_RAW_DATABASE_URL)
_is_local = "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL

_connect_args = {"statement_cache_size": 0}
if not _is_local:
    _connect_args["ssl"] = "require"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    pool_pre_ping=True,
    connect_args=_connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
