from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import (
    get_current_user,
    allow_teacher_admin,
    get_attendance_service,
)
from ..models import User, AttendanceRecord
from ..attendance import AttendanceService

router = APIRouter(tags=["unknowns"])


@router.post("/unknowns/{unknown_id}/resolve", response_model=AttendanceRecord)
def resolve_unknown_face(
    unknown_id: int,
    student_name: str,
    current_user: User = Depends(allow_teacher_admin),
    svc: AttendanceService = Depends(get_attendance_service),
):
    record = svc.resolve_unknown(unknown_id, student_name)
    if not record:
        raise HTTPException(status_code=404, detail="Unknown face not found")
    return record
