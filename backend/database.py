import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

# Use environment variable for DB URL or default to a local PostgreSQL instance.
# On Neon/Vercel: use the POOLED connection string (has "-pooler" in the hostname).
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/trust_estate")

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    poolclass=NullPool,       # Neon's PgBouncer does the real pooling; don't double-pool
    pool_pre_ping=True,       # guards against a stale connection after Neon scales to zero
    connect_args={"statement_cache_size": 0},  # required for asyncpg + PgBouncer transaction pooling
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    """Dependency to yield a database session."""
    async with AsyncSessionLocal() as session:
        yield session
