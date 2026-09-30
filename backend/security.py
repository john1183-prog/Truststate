import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from argon2 import PasswordHasher
from sqlalchemy import text, func, update, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

import models
import database

# -----------------------------------------------------------------------------
# Password Hashing (Argon2id)
# Parameters locked: time_cost=2, memory_cost=19456 KiB (19 MiB), parallelism=1
# -----------------------------------------------------------------------------
ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
    hash_len=32,
    salt_len=16,
)

# Pre-computed dummy hash to equalize timing on nonexistent users or NULL password_hash
DUMMY_HASH = ph.hash("timing-dummy-password-value-for-safe-verification")


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return ph.hash(password)


def verify_password(password: str, hash_str: Optional[str]) -> bool:
    """
    Verify password against an Argon2id hash.
    If hash_str is None or empty, runs verification against DUMMY_HASH to equalize timing.
    """
    if not hash_str:
        try:
            ph.verify(DUMMY_HASH, password)
        except Exception:
            pass
        return False
    try:
        return ph.verify(hash_str, password)
    except Exception:
        return False


# -----------------------------------------------------------------------------
# Environment & Cookie Configuration
# -----------------------------------------------------------------------------
IS_PRODUCTION = (
    os.getenv("ENVIRONMENT", "development").lower() == "production"
    or os.getenv("VERCEL_ENV") == "production"
)

REFRESH_TOKEN_MAX_AGE_SECONDS = 604800  # 7 days (7 * 24 * 3600)


def get_cookie_config() -> dict:
    """Return environment-appropriate cookie attributes for refresh token."""
    if IS_PRODUCTION:
        return {
            "key": "refresh_token",
            "httponly": True,
            "secure": True,
            "samesite": "strict",
            "path": "/auth",
            "max_age": REFRESH_TOKEN_MAX_AGE_SECONDS,
        }
    return {
        "key": "refresh_token",
        "httponly": True,
        "secure": False,
        "samesite": "lax",
        "path": "/auth",
        "max_age": REFRESH_TOKEN_MAX_AGE_SECONDS,
    }


def set_refresh_cookie(response: Response, token: str) -> None:
    """Attach the refresh token as an HttpOnly cookie to the response."""
    cfg = get_cookie_config()
    response.set_cookie(
        key=cfg["key"],
        value=token,
        httponly=cfg["httponly"],
        secure=cfg["secure"],
        samesite=cfg["samesite"],
        path=cfg["path"],
        max_age=cfg["max_age"],
    )


def clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie using matching path/attributes."""
    cfg = get_cookie_config()
    response.set_cookie(
        key=cfg["key"],
        value="",
        httponly=cfg["httponly"],
        secure=cfg["secure"],
        samesite=cfg["samesite"],
        path=cfg["path"],
        max_age=0,
    )


# -----------------------------------------------------------------------------
# JWT Access Token Management
# -----------------------------------------------------------------------------
_raw_jwt_secret = os.getenv("JWT_SECRET_KEY")
if _raw_jwt_secret is not None and _raw_jwt_secret.strip():
    JWT_SECRET_KEY = _raw_jwt_secret.strip()
elif IS_PRODUCTION:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is mandatory in production but is missing or empty."
    )
else:
    JWT_SECRET_KEY = "dev-secret-key-change-in-production-trustestate-at-least-64-bytes-long"

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15


def create_access_token(user_id: int, role: str, token_version: int) -> str:
    """Issue a 15-minute signed JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "role": role,
        "token_version": token_version,
        "exp": expire,
    }
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate access token signature and expiration."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


# -----------------------------------------------------------------------------
# Refresh Token Utilities & Atomic Concurrency-Safe Rotation
# -----------------------------------------------------------------------------
def generate_refresh_token() -> str:
    """Generate cryptographically secure 32-byte URL-safe refresh token."""
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    """Compute SHA-256 hash of refresh token for database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def consume_and_rotate_refresh_token(
    raw_token: str,
    db: AsyncSession,
) -> Tuple[int, str]:
    """
    Atomically consume a valid refresh token and issue a replacement in one transaction.
    If token is already consumed, detects reuse and revokes all sessions for that user.
    Returns (user_id, new_raw_refresh_token).
    """
    token_hash = hash_refresh_token(raw_token)

    # 1. Atomic consumption
    stmt = (
        update(models.AuthSession)
        .where(
            models.AuthSession.token_hash == token_hash,
            models.AuthSession.consumed == False,
            models.AuthSession.expires_at >= func.now(),
        )
        .values(
            consumed=True,
            consumed_at=func.now(),
        )
        .returning(models.AuthSession.user_id)
    )
    res = await db.execute(stmt)
    user_id = res.scalar_one_or_none()

    if user_id is not None:
        # Atomic success: generate replacement in the same transaction
        new_raw_token = generate_refresh_token()
        new_hash = hash_refresh_token(new_raw_token)
        new_session = models.AuthSession(
            user_id=user_id,
            token_hash=new_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            consumed=False,
        )
        db.add(new_session)

        # Opportunistic cleanup: prune sessions expired for more than 7 days
        await db.execute(
            delete(models.AuthSession).where(
                models.AuthSession.expires_at < func.now() - text("INTERVAL '7 days'")
            )
        )
        await db.commit()
        return user_id, new_raw_token

    # 2. Failure path: secondary lookup to detect token reuse
    lookup = await db.execute(
        select(models.AuthSession).where(models.AuthSession.token_hash == token_hash)
    )
    session_row = lookup.scalar_one_or_none()

    if session_row and session_row.consumed:
        # REUSE DETECTED: Revoke all active sessions for this user
        await db.execute(
            delete(models.AuthSession).where(models.AuthSession.user_id == session_row.user_id)
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked due to token reuse",
        )

    # Unknown or expired token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
    )


# -----------------------------------------------------------------------------
# PostgreSQL-Backed Rate Limiter
# -----------------------------------------------------------------------------
async def check_rate_limit(
    key: str,
    limit: int,
    window_minutes: int,
    db: AsyncSession,
) -> None:
    """
    Check if a rate limit key has exceeded its limit.
    Does not increment the counter (checked prior to authentication).
    """
    res = await db.execute(
        select(models.AuthRateLimit).where(models.AuthRateLimit.key == key)
    )
    rate_entry = res.scalar_one_or_none()
    if rate_entry:
        window_duration = timedelta(minutes=window_minutes)
        now_utc = datetime.now(timezone.utc)
        # PostgreSQL timezone-aware datetime or naive UTC comparison
        entry_time = rate_entry.window_start
        if entry_time.tzinfo is None:
            entry_time = entry_time.replace(tzinfo=timezone.utc)
        if entry_time + window_duration > now_utc:
            if rate_entry.attempts >= limit:
                remaining_seconds = int((entry_time + window_duration - now_utc).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed authentication attempts. Please try again later.",
                    headers={"Retry-After": str(max(remaining_seconds, 1))},
                )


async def increment_failed_rate_limit(
    key: str,
    window_minutes: int,
    db: AsyncSession,
) -> None:
    """
    Atomically increment the failed attempt counter for a rate limit key.
    Resets window if prior window has passed.
    """
    query = text("""
        INSERT INTO auth_rate_limits (key, attempts, window_start)
        VALUES (:key, 1, NOW())
        ON CONFLICT (key)
        DO UPDATE SET
            attempts = CASE
                WHEN auth_rate_limits.window_start < NOW() - (INTERVAL '1 minute' * :window)
                THEN 1
                ELSE auth_rate_limits.attempts + 1
            END,
            window_start = CASE
                WHEN auth_rate_limits.window_start < NOW() - (INTERVAL '1 minute' * :window)
                THEN NOW()
                ELSE auth_rate_limits.window_start
            END;
    """)
    await db.execute(query, {"key": key, "window": window_minutes})
    await db.commit()


async def reset_rate_limit(key: str, db: AsyncSession) -> None:
    """Reset rate limit counter upon successful authentication."""
    await db.execute(
        delete(models.AuthRateLimit).where(models.AuthRateLimit.key == key)
    )
    await db.commit()


# -----------------------------------------------------------------------------
# FastAPI Authentication Dependencies
# -----------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(database.get_db),
) -> models.User:
    """
    Extract, validate JWT, and fetch current user from database.
    Database is authoritative for existence, is_active, role, and token_version.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(token)
        sub = payload.get("sub")
        token_v = payload.get("token_version")
        if sub is None or token_v is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.token_version != token_v:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def require_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Verify that current user has admin role (DB-authoritative)."""
    if current_user.role != models.RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_agent(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Verify that current user has agent role (DB-authoritative)."""
    if current_user.role != models.RoleEnum.agent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent access required",
        )
    return current_user


async def require_lawyer(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Verify that current user has lawyer role (DB-authoritative)."""
    if current_user.role != models.RoleEnum.lawyer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lawyer access required",
        )
    return current_user


async def require_verified_lawyer(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Verify that current user has lawyer role and is verified (DB-authoritative)."""
    if current_user.role != models.RoleEnum.lawyer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lawyer access required",
        )
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verified lawyer status required",
        )
    return current_user

