"""
Dependency injection for FastAPI routers.

All services are accessed from `request.app.state` which is populated
during the application lifespan in main.py. This eliminates mutable
global state and the bugs that come with it.
"""
from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session, select
from jose import jwt, JWTError

from .database import engine
from .models import User, UserRole
from .auth_service import oauth2_scheme, SECRET_KEY, ALGORITHM
from .attendance import AttendanceService
from .dispute_service import DisputeService
from .admin_service import AdminService
from .embedding_loader import EmbeddingLoader
from .recognition import RecognitionService
from .video_processor import VideoProcessor


# ---------- Database Session ----------

def get_session():
    """Yields a SQLModel database session."""
    with Session(engine) as session:
        yield session


# ---------- Auth Dependencies ----------

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Decode JWT and return the authenticated User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            raise credentials_exception
        return user


class RoleChecker:
    """Callable dependency that verifies the user has an allowed role."""

    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {[r.value for r in self.allowed_roles]}",
            )
        return user


# Pre-built role checkers
allow_admin = RoleChecker([UserRole.ADMIN])
allow_teacher = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_teacher_kiosk = RoleChecker([UserRole.TEACHER, UserRole.ADMIN, UserRole.KIOSK])


# ---------- Service Dependencies (from app.state) ----------

def get_attendance_service(request: Request) -> AttendanceService:
    return request.app.state.attendance_service


def get_dispute_service(request: Request) -> DisputeService:
    return request.app.state.dispute_service


def get_admin_service(request: Request) -> AdminService:
    return request.app.state.admin_service


def get_embedding_loader(request: Request) -> EmbeddingLoader:
    return request.app.state.embedding_loader


def get_recognition_service(request: Request) -> RecognitionService:
    return request.app.state.recognition_service


def get_video_processor(request: Request) -> VideoProcessor:
    return request.app.state.video_processor
