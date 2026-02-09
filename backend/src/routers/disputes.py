from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import (
    get_current_user, 
    allow_teacher_admin, 
    dispute_service
)
from ..models import User
from ..schemas import DisputeRead

router = APIRouter(tags=["disputes"])

@router.get("/disputes/my", response_model=List[DisputeRead])
def get_my_disputes(current_user: User = Depends(get_current_user)):
    try:
        return dispute_service.get_my_disputes(current_user.username)
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/disputes", response_model=List[DisputeRead])
def get_all_disputes(current_user: User = Depends(allow_teacher_admin)):
    try:
        return dispute_service.get_all_disputes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
