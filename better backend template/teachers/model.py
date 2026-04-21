import uuid

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    user = relationship("User", lazy="joined")
    classes = relationship("Class", back_populates="teacher")
