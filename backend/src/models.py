from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, Column
from pgvector.sqlalchemy import Vector


# ── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    KIOSK = "kiosk"


class DisputeStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class DoubtStatus(str, Enum):
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class MessageRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    AI = "ai"
    SYSTEM = "system"


class SubmissionStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    GRADED = "graded"


class NotificationType(str, Enum):
    ATTENDANCE = "attendance"
    DOUBT = "doubt"
    ANNOUNCEMENT = "announcement"
    ASSIGNMENT = "assignment"
    MARKS = "marks"


class ResourceType(str, Enum):
    EBOOK = "ebook"
    PAPER = "paper"
    VIDEO = "video"
    PDF = "pdf"
    LINK = "link"


# ── Core / Attendance Models ───────────────────────────────────────────────

class ClassGroup(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    sessions: List["AttendanceSession"] = Relationship(back_populates="class_group")
    students: List["User"] = Relationship(back_populates="class_group")


class AttendanceSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    class_id: Optional[int] = Field(default=None, foreign_key="classgroup.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    is_active: bool = Field(default=True)

    class_group: Optional[ClassGroup] = Relationship(back_populates="sessions")


class AttendanceRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_name: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    session_id: Optional[int] = Field(default=None, foreign_key="attendancesession.id", index=True)
    metadata_json: Optional[str] = Field(default=None)


class UnknownFace(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="attendancesession.id", index=True)
    image_path: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence: Optional[float] = None
    is_resolved: bool = Field(default=False)
    resolved_to: Optional[str] = None


class AttendanceSource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="attendancesession.id", index=True)
    file_path: str
    media_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Dispute(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_username: str = Field(foreign_key="user.username")
    session_id: int = Field(foreign_key="attendancesession.id", index=True)
    attendance_source_id: Optional[int] = Field(default=None, foreign_key="attendancesource.id")
    selected_face_coords: Optional[str] = None
    description: str
    status: DisputeStatus = Field(default=DisputeStatus.PENDING, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_username: str = Field(foreign_key="user.username")
    action: str
    target_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── User ──────────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole
    full_name: Optional[str] = None
    email: Optional[str] = None
    sap_id: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    subjects_json: Optional[str] = None  # JSON list e.g. '["Math","Physics"]'
    max_load: int = Field(default=5)
    status: str = Field(default="offline")  # online / offline / busy
    face_identity: Optional[str] = None
    class_id: Optional[int] = Field(default=None, foreign_key="classgroup.id", index=True)

    class_group: Optional[ClassGroup] = Relationship(back_populates="students")


# ── Cognify: Doubts ────────────────────────────────────────────────────────

class Doubt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_username: str = Field(foreign_key="user.username", index=True)
    teacher_username: Optional[str] = Field(default=None, foreign_key="user.username", index=True)
    text: str
    subject: Optional[str] = None
    confidence: Optional[float] = None
    status: DoubtStatus = Field(default=DoubtStatus.QUEUED, index=True)
    ai_answer: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DoubtMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    doubt_id: int = Field(foreign_key="doubt.id", index=True)
    sender_username: str
    role: MessageRole
    text: str
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Cognify: Assignments ───────────────────────────────────────────────────

class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    subject: str
    description: str
    due_date: Optional[datetime] = None
    max_marks: int = Field(default=100)
    teacher_username: str = Field(foreign_key="user.username", index=True)
    class_id: Optional[int] = Field(default=None, foreign_key="classgroup.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Submission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="assignment.id", index=True)
    student_username: str = Field(foreign_key="user.username", index=True)
    submission_text: Optional[str] = None
    status: SubmissionStatus = Field(default=SubmissionStatus.PENDING)
    grade: Optional[float] = None
    feedback: Optional[str] = None
    ai_feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None


# ── Cognify: Notifications ─────────────────────────────────────────────────

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_username: str = Field(foreign_key="user.username", index=True)
    title: str
    message: str
    notification_type: NotificationType = Field(default=NotificationType.ANNOUNCEMENT)
    is_urgent: bool = Field(default=False)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Cognify: Library Resources ─────────────────────────────────────────────

class Resource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    subject: str
    resource_type: ResourceType = Field(default=ResourceType.LINK)
    author: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    tags_json: Optional[str] = None
    url: Optional[str] = None
    uploaded_by: str = Field(foreign_key="user.username")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Cognify: Schedule / Timetable ─────────────────────────────────────────

class Schedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    class_id: Optional[int] = Field(default=None, foreign_key="classgroup.id", index=True)
    teacher_username: str = Field(foreign_key="user.username")
    subject: str
    day_of_week: int          # 0 = Monday … 6 = Sunday
    start_time: str           # "09:00"
    end_time: str             # "10:00"
    room: Optional[str] = None
    schedule_type: str = Field(default="lecture")


# ── Cognify: Direct Messages ──────────────────────────────────────────────

class DirectMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sender_username: str = Field(foreign_key="user.username", index=True)
    recipient_username: str = Field(foreign_key="user.username", index=True)
    text: str
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Cognify: Marks / Results ───────────────────────────────────────────────

class SubjectMark(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_username: str = Field(foreign_key="user.username", index=True)
    subject: str
    semester: int = Field(default=1)
    internal_marks: Optional[float] = None
    external_marks: Optional[float] = None
    practical_marks: Optional[float] = None
    max_marks: float = Field(default=100)
    grade: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ── Pydantic / Non-table helpers ───────────────────────────────────────────

class DisputeCreate(SQLModel):
    session_id: int
    description: str
    attendance_source_id: Optional[int] = None
    selected_face_coords: Optional[List[int]] = None


class UserCreate(SQLModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    face_identity: Optional[str] = None
    class_id: Optional[int] = None


class Token(SQLModel):
    access_token: str
    token_type: str
    role: str


class TokenData(SQLModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ── ArcFace Embedding (main repo only) ─────────────────────────────────────

class StudentFace(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: str = Field(foreign_key="user.username", index=True)
    embedding: List[float] = Field(sa_column=Column(Vector(512)))
    created_at: datetime = Field(default_factory=datetime.utcnow)

