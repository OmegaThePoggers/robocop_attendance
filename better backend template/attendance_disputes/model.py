import uuid
import enum
from datetime import datetime

from sqlalchemy import Integer, Text, DateTime, ForeignKey, Enum, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class DisputeStatus(str, enum.Enum):
    pending = "pending"
    auto_approved = "auto_approved"
    admin_review = "admin_review"
    resolved = "resolved"


class AttendanceDispute(Base):
    __tablename__ = "attendance_disputes"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    record_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("attendance_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("students.id"), nullable=False
    )
    bbox_x: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_y: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_w: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox_h: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[DisputeStatus] = mapped_column(
        Enum(DisputeStatus, name="dispute_status"), default=DisputeStatus.pending, nullable=False
    )
    admin_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_attendance_disputes_status", "status"),
    )
