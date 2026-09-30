from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
import database
import security

router = APIRouter(prefix="/auth", tags=["auth"])


def _extract_client_ip(request: Request) -> str:
    """Extract client IP respecting X-Forwarded-For if behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.post("/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: schemas.UserRegister,
    db: AsyncSession = Depends(database.get_db),
):
    """
    Public registration for seekers, agents, and lawyers.
    Registration as admin is strictly rejected with 422.
    """
    if user_in.role == models.RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Registration as admin is not permitted via public registration",
        )

    email_norm = user_in.email.strip().lower()

    # Check email uniqueness
    existing_res = await db.execute(
        select(models.User).where(models.User.email == email_norm)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Hash password with Argon2id
    hashed_pw = security.hash_password(user_in.password)

    user_data = user_in.model_dump(exclude={"password"})
    user_data["email"] = email_norm
    if isinstance(user_data.get("specializations"), list):
        user_data["specializations"] = ", ".join(user_data["specializations"])

    new_user = models.User(
        **user_data,
        password_hash=hashed_pw,
        is_verified=False,
        is_active=True,
        token_version=1,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    login_data: schemas.LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(database.get_db),
):
    """
    Public login endpoint:
    - Enforces dual-key rate limiting (30/15m on IP, 5/15m on email)
    - Safe constant-time dummy verification on nonexistent or NULL password users
    - Returns 15-minute access token and sets 7-day HttpOnly refresh cookie
    """
    client_ip = _extract_client_ip(request)
    email_norm = login_data.email.strip().lower()

    ip_key = f"ip:{client_ip}"
    id_key = f"identifier:{email_norm}"

    # 1. Check rate limits prior to authentication
    await security.check_rate_limit(ip_key, limit=30, window_minutes=15, db=db)
    await security.check_rate_limit(id_key, limit=5, window_minutes=15, db=db)

    # 2. Query user by normalized email
    res = await db.execute(
        select(models.User).where(models.User.email == email_norm)
    )
    user = res.scalar_one_or_none()

    generic_auth_failure = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 3. Safe password check (timing-safe on None user or None password_hash)
    if not user:
        security.verify_password(login_data.password, None)
        await security.increment_failed_rate_limit(ip_key, window_minutes=15, db=db)
        await security.increment_failed_rate_limit(id_key, window_minutes=15, db=db)
        raise generic_auth_failure

    if not security.verify_password(login_data.password, user.password_hash):
        await security.increment_failed_rate_limit(ip_key, window_minutes=15, db=db)
        await security.increment_failed_rate_limit(id_key, window_minutes=15, db=db)
        raise generic_auth_failure

    if not user.is_active:
        await security.increment_failed_rate_limit(ip_key, window_minutes=15, db=db)
        await security.increment_failed_rate_limit(id_key, window_minutes=15, db=db)
        raise generic_auth_failure

    # 4. Successful login: reset failed counter on identifier key
    await security.reset_rate_limit(id_key, db=db)

    # 5. Issue 15-minute access token
    access_token = security.create_access_token(
        user_id=user.id,
        role=user.role.value,
        token_version=user.token_version,
    )

    # 6. Issue 7-day refresh token & store hash in auth_sessions
    raw_refresh = security.generate_refresh_token()
    token_hash = security.hash_refresh_token(raw_refresh)
    session_row = models.AuthSession(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        consumed=False,
    )
    db.add(session_row)
    await db.commit()

    # 7. Set HttpOnly cookie
    security.set_refresh_cookie(response, raw_refresh)

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.post("/refresh", response_model=schemas.TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(database.get_db),
):
    """
    Atomic refresh token rotation:
    - Reads refresh cookie
    - Atomically consumes token and issues replacement in a single transaction
    - Detects reuse of consumed tokens and revokes all active sessions for the user
    - Returns new 15-minute access token and sets new 7-day refresh cookie
    """
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    user_id, new_raw_token = await security.consume_and_rotate_refresh_token(raw_token, db)

    res = await db.execute(select(models.User).where(models.User.id == user_id))
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        security.clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found",
        )

    # Issue replacement access token
    new_access_token = security.create_access_token(
        user_id=user.id,
        role=user.role.value,
        token_version=user.token_version,
    )

    # Set rotated cookie
    security.set_refresh_cookie(response, new_raw_token)

    return schemas.TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        user=user,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(database.get_db),
):
    """
    Logs out the current session:
    - Deletes matching refresh session row if token present
    - Clears HttpOnly refresh cookie with matching attributes
    """
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        token_hash = security.hash_refresh_token(raw_token)
        await db.execute(
            delete(models.AuthSession).where(models.AuthSession.token_hash == token_hash)
        )
        await db.commit()

    security.clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@router.post("/change-password")
async def change_password(
    body: schemas.ChangePasswordRequest,
    response: Response,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """
    Authenticated password change:
    - Verifies old password
    - Updates Argon2id hash
    - Increments token_version (invalidating all outstanding access tokens)
    - Deletes all active refresh sessions for user
    - Clears refresh cookie
    """
    if not security.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    new_hash = security.hash_password(body.new_password)
    current_user.password_hash = new_hash
    current_user.token_version = current_user.token_version + 1

    # Revoke all existing refresh sessions
    await db.execute(
        delete(models.AuthSession).where(models.AuthSession.user_id == current_user.id)
    )
    await db.commit()

    security.clear_refresh_cookie(response)
    return {"message": "Password changed successfully. Please log in again."}


@router.get("/me", response_model=schemas.UserRead)
async def get_me(
    current_user: models.User = Depends(security.get_current_user),
):
    """Return DB-authoritative profile for the currently authenticated user."""
    return current_user
