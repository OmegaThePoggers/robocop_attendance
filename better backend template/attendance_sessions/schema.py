from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from attendance_sessions.model import SessionStatus, AttendanceStatus


class SessionCreate(BaseModel):
    class_id: str


class OverrideRequest(BaseModel):
    student_id: str
    new_status: AttendanceStatus


class AttendanceRecordResponse(BaseModel):
    id: str
    session_id: str
    student_id: str
    status: AttendanceStatus
    confidence: Optional[float]
    overridden_by_teacher: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: str
    class_id: str
    teacher_id: str
    image_url: Optional[str]
    status: SessionStatus
    created_at: datetime
    processed_at: Optional[datetime]
    confirmed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SessionResultsResponse(BaseModel):
    session: SessionResponse
    records: List[AttendanceRecordResponse]
    total_students: int
    present_count: int
    absent_count: int
