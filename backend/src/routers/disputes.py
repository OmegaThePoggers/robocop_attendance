from typing import List
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import (
    get_current_user,
    allow_teacher_admin,
    get_dispute_service,
)
from ..models import User, Dispute, DisputeCreate, DisputeStatus
from ..schemas import DisputeRead
from ..dispute_service import DisputeService

router = APIRouter(tags=["disputes"])


@router.post("/disputes", response_model=Dispute)
def create_dispute(
    dispute_in: DisputeCreate,
    current_user: User = Depends(get_current_user),
    svc: DisputeService = Depends(get_dispute_service),
):
    try:
        return svc.create_dispute(
            student_username=current_user.username,
            session_id=dispute_in.session_id,
            description=dispute_in.description,
            attendance_source_id=dispute_in.attendance_source_id,
            selected_face_coords=dispute_in.selected_face_coords,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/disputes/my", response_model=List[DisputeRead])
def get_my_disputes(
    current_user: User = Depends(get_current_user),
    svc: DisputeService = Depends(get_dispute_service),
):
    try:
        return svc.get_my_disputes(current_user.username)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/disputes", response_model=List[DisputeRead])
def get_all_disputes(
    current_user: User = Depends(allow_teacher_admin),
    svc: DisputeService = Depends(get_dispute_service),
):
    try:
        return svc.get_all_disputes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disputes/{dispute_id}/resolve", response_model=Dispute)
def resolve_dispute(
    dispute_id: int,
    status: str,
    current_user: User = Depends(allow_teacher_admin),
    svc: DisputeService = Depends(get_dispute_service),
):
    try:
        result = svc.resolve_dispute(dispute_id, DisputeStatus(status))
        if not result:
            raise HTTPException(status_code=404, detail="Dispute not found")
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {[s.value for s in DisputeStatus]}")
