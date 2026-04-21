from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from classes import service
from classes.schema import ClassCreate, ClassUpdate, AddStudentRequest, ClassResponse

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.post("/", response_model=ClassResponse)
async def create_class(
    body: ClassCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("teacher", "admin")),
):
    teacher_id = getattr(current_user, "teacher_profile", None)
    tid = teacher_id.id if teacher_id else body.__dict__.get("teacher_id")
    return await service.create_class(db, body, tid)


@router.get("/", response_model=List[ClassResponse])
async def list_classes(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.get_all_classes(db)


@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.get_class(db, class_id)


@router.patch("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: str,
    body: ClassUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("teacher", "admin")),
):
    return await service.update_class(db, class_id, body)


@router.delete("/{class_id}", status_code=204)
async def delete_class(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await service.delete_class(db, class_id)


@router.post("/{class_id}/students", status_code=201)
async def add_student(
    class_id: str,
    body: AddStudentRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("teacher", "admin")),
):
    await service.add_student(db, class_id, body.student_id)
    return {"message": "Student added to class"}


@router.delete("/{class_id}/students/{student_id}", status_code=204)
async def remove_student(
    class_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("teacher", "admin")),
):
    await service.remove_student(db, class_id, student_id)
