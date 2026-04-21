from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_role
from attendance_sessions import service
from attendance_sessions.schema import (
    SessionCreate, SessionResponse, OverrideRequest,
    AttendanceRecordResponse, SessionResultsResponse,
)
from teachers.model import Teacher
from sqlalchemy import select

router = APIRouter(prefix="/attendance-sessions", tags=["Attendance Sessions"])


async def _get_teacher_id(current_user, db: AsyncSession) -> str:
    result = await db.execute(select(Teacher).where(Teacher.user_id == current_user.id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Teacher profile not found")
    return teacher.id


@router.post("/", response_model=SessionResponse)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("teacher")),
):
    teacher_id = await _get_teacher_id(current_user, db)
    return await service.create_session(db, body, teacher_id)


@router.post("/{session_id}/photo", response_model=SessionResponse)
async def upload_photo(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("teacher")),
):
    teacher_id = await _get_teacher_id(current_user, db)
    return await service.upload_photo(db, session_id, file, teacher_id)


@router.get("/{session_id}/results", response_model=SessionResultsResponse)
async def get_results(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("teacher", "admin")),
):
    return await service.get_session_results(db, session_id)


@router.post("/{session_id}/override", response_model=AttendanceRecordResponse)
async def override_record(
    session_id: str,
    body: OverrideRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("teacher")),
):
    teacher_id = await _get_teacher_id(current_user, db)
    return await service.teacher_override(db, session_id, body, teacher_id)


@router.post("/{session_id}/confirm", response_model=SessionResponse)
async def confirm_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("teacher")),
):
    teacher_id = await _get_teacher_id(current_user, db)
    return await service.confirm_session(db, session_id, teacher_id)
