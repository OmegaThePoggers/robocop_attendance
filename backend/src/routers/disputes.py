from typing import List
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import (
    get_current_user,
    allow_teacher_admin,
    get_dispute_service,
)
from ..models import User
from ..schemas import DisputeRead
from ..dispute_service import DisputeService

router = APIRouter(tags=["disputes"])


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
