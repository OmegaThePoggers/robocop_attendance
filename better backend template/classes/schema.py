from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ClassCreate(BaseModel):
    name: str
    subject: Optional[str] = None
    teacher_id: Optional[str] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None


class AddStudentRequest(BaseModel):
    student_id: str


class ClassResponse(BaseModel):
    id: str
    name: str
    subject: Optional[str]
    teacher_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
