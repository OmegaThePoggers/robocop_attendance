import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Float, Boolean, ForeignKey, Enum, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class SessionStatus(str, enum.Enum):
    created = "created"
    processing = "processing"
    review = "review"
    confirmed = "confirmed"
    locked = "locked"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    overridden_present = "overridden_present"
    overridden_absent = "overridden_absent"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    class_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("teachers.id"), nullable=False
    )
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status"), default=SessionStatus.created, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("students.id"), nullable=False
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    overridden_by_teacher: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session = relationship("AttendanceSession", back_populates="records")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
        Index("idx_attendance_records_session_id", "session_id"),
    )
