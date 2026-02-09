from fastapi import APIRouter, Depends, HTTPException, Query
from ..dependencies import get_current_user, attendance_service, User, allow_teacher_admin
from ..models import AttendanceRecord

router = APIRouter(tags=["unknowns"])

@router.post("/unknowns/{unknown_id}/resolve", response_model=AttendanceRecord)
def resolve_unknown_face(
    unknown_id: int, 
    student_name: str, 
    current_user: User = Depends(allow_teacher_admin)
):
    record = attendance_service.resolve_unknown(unknown_id, student_name)
    if not record:
        raise HTTPException(status_code=404, detail="Unknown face not found")
    return record
