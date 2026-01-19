from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel

class AttendanceSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    is_active: bool = Field(default=True)

class AttendanceRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_name: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    session_id: Optional[int] = Field(default=None, foreign_key="attendancesession.id", index=True)
    # Store JSON metadata (bounding box, recognition details)
    # Using str for SQLite compatibility, or use sa_column for JSON
    metadata_json: Optional[str] = Field(default=None)

class UnknownFace(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="attendancesession.id", index=True)
    image_path: str # Path to the cropped face image
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence: Optional[float] = None
    is_resolved: bool = Field(default=False)
    resolved_to: Optional[str] = None # Name of student if resolved

class DisputeStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Dispute(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_username: str = Field(foreign_key="user.username")
    session_id: int = Field(foreign_key="attendancesession.id", index=True)
    description: str
    status: DisputeStatus = Field(default=DisputeStatus.PENDING, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DisputeCreate(SQLModel):
    session_id: int
    description: str

class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    KIOSK = "kiosk"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole
    full_name: Optional[str] = None
    sap_id: Optional[str] = None
    # For robust mapping, we might store "face_identity" here
    face_identity: Optional[str] = None 

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_username: str = Field(foreign_key="user.username")
    action: str
    target_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
