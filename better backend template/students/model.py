import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    sap_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    user = relationship("User", lazy="joined")
    faces = relationship("StudentFace", back_populates="student", cascade="all, delete-orphan")
    class_enrollments = relationship("ClassStudent", back_populates="student")


class StudentFace(Base):
    __tablename__ = "student_faces"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    student_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # embedding stored as text cast to vector; pgvector type handled via raw SQL
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="faces")
