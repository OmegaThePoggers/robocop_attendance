import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    teacher_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("Teacher", back_populates="classes")
    students = relationship("ClassStudent", back_populates="cls", cascade="all, delete-orphan")


class ClassStudent(Base):
    __tablename__ = "class_students"

    class_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True
    )
    student_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )

    cls = relationship("Class", back_populates="students")
    student = relationship("Student", back_populates="class_enrollments")

    __table_args__ = (
        Index("idx_class_students_class_id", "class_id"),
    )
