from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime, timedelta
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

# Service Singletons
# These should be initialized at startup
attendance_service = AttendanceService()
dispute_service = DisputeService()
admin_service = AdminService()

embedding_loader: Optional[EmbeddingLoader] = None
recognition_service: Optional[RecognitionService] = None
video_processor: Optional[VideoProcessor] = None

def get_session():
    with Session(engine) as session:
        yield session

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
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
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Operation not permitted"
            )
        return user

# Role Dependencies
allow_admin = RoleChecker([UserRole.ADMIN])
allow_teacher = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_teacher_kiosk = RoleChecker([UserRole.TEACHER, UserRole.ADMIN, UserRole.KIOSK])
