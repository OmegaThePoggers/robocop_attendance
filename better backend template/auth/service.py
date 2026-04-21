from datetime import datetime, timezone, timedelta
from typing import Set

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth.model import User
from auth.schema import LoginRequest
from core.config import settings
from core.security import verify_password, create_access_token, create_refresh_token, decode_token, hash_password

# ---------------------------------------------------------------------------
# FIX 8: In-memory refresh token revocation store.
# In production replace with a Redis SET (TTL = refresh token expiry).
# ---------------------------------------------------------------------------
_revoked_refresh_tokens: Set[str] = set()


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> User:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Lockout check
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked until {user.locked_until.isoformat()}",
        )

    if not verify_password(data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=settings.LOCKOUT_DURATION_MINUTES
            )
            user.failed_login_attempts = 0
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Successful login — reset counters
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()
    return user


def build_tokens(user: User) -> dict:
    payload = {"sub": str(user.id), "role": user.role}
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
    }


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> dict:
    """
    FIX 8: Refresh token rotation.
    1. Verify the token is valid and not already revoked.
    2. Revoke the used token immediately.
    3. Issue a fresh access + refresh token pair.
    """
    # Check revocation list first
    if refresh_token in _revoked_refresh_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has already been used",
        )

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload.get("sub")))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Invalidate the consumed refresh token (rotate it)
    _revoked_refresh_tokens.add(refresh_token)

    return build_tokens(user)
