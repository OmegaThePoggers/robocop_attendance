from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from teachers import service
from teachers.schema import TeacherCreate, TeacherUpdate, TeacherResponse

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.post("/", response_model=TeacherResponse)
async def create_teacher(
    body: TeacherCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await service.create_teacher(db, body)


@router.get("/", response_model=List[TeacherResponse])
async def list_teachers(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await service.get_all_teachers(db)


@router.get("/{teacher_id}", response_model=TeacherResponse)
async def get_teacher(
    teacher_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.get_teacher_dict(db, teacher_id)


@router.patch("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    teacher_id: str,
    body: TeacherUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await service.update_teacher(db, teacher_id, body)


@router.delete("/{teacher_id}", status_code=204)
async def delete_teacher(
    teacher_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await service.delete_teacher(db, teacher_id)
