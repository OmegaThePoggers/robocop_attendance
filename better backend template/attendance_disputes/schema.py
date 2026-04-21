from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from attendance_disputes.model import DisputeStatus


class DisputeCreate(BaseModel):
    record_id: str
    bbox_x: int
    bbox_y: int
    bbox_w: int
    bbox_h: int


class DisputeResolve(BaseModel):
    resolution_note: str
    approved: bool  # True → override record to overridden_present


class DisputeResponse(BaseModel):
    id: str
    record_id: str
    student_id: str
    bbox_x: int
    bbox_y: int
    bbox_w: int
    bbox_h: int
    status: DisputeStatus
    admin_id: Optional[str]
    resolution_note: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
