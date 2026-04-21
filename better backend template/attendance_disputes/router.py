from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.dependencies import get_current_user, require_role
from attendance_disputes import service
from attendance_disputes.schema import DisputeCreate, DisputeResolve, DisputeResponse
from students.model import Student

router = APIRouter(prefix="/disputes", tags=["Attendance Disputes"])


async def _get_student_id(current_user, db: AsyncSession) -> str:
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Student profile not found")
    return student.id


@router.post("/", response_model=DisputeResponse, status_code=201)
async def submit_dispute(
    body: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("student")),
):
    student_id = await _get_student_id(current_user, db)
    return await service.submit_dispute(db, body, student_id)


@router.get("/my", response_model=List[DisputeResponse])
async def my_disputes(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("student")),
):
    student_id = await _get_student_id(current_user, db)
    return await service.list_student_disputes(db, student_id)


@router.get("/", response_model=List[DisputeResponse])
async def list_all_disputes(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await service.list_disputes(db, status)


@router.get("/{dispute_id}", response_model=DisputeResponse)
async def get_dispute(
    dispute_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.get_dispute(db, dispute_id)


@router.patch("/{dispute_id}/resolve", response_model=DisputeResponse)
async def resolve_dispute(
    dispute_id: str,
    body: DisputeResolve,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    return await service.admin_resolve(db, dispute_id, body, str(current_user.id))
