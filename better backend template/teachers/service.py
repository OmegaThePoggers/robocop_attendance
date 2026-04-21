import uuid
from typing import List, Any, Dict

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from auth.model import User, UserRole
from teachers.model import Teacher
from teachers.schema import TeacherCreate, TeacherUpdate
from core.security import hash_password


def _teacher_dict(teacher: Teacher) -> Dict[str, Any]:
    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "employee_id": teacher.employee_id,
        "name": teacher.user.name,
        "email": teacher.user.email,
    }


async def create_teacher(db: AsyncSession, data: TeacherCreate) -> Dict[str, Any]:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.teacher,
        name=data.name,
    )
    db.add(user)
    await db.flush()

    teacher = Teacher(id=str(uuid.uuid4()), user_id=user.id, employee_id=data.employee_id)
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)
    await db.refresh(teacher, ["user"])
    return _teacher_dict(teacher)


async def get_teacher(db: AsyncSession, teacher_id: str) -> Teacher:
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.user)).where(Teacher.id == teacher_id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


async def get_teacher_dict(db: AsyncSession, teacher_id: str) -> Dict[str, Any]:
    return _teacher_dict(await get_teacher(db, teacher_id))


async def get_all_teachers(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(select(Teacher).options(selectinload(Teacher.user)))
    return [_teacher_dict(t) for t in result.scalars().all()]


async def update_teacher(db: AsyncSession, teacher_id: str, data: TeacherUpdate) -> Dict[str, Any]:
    teacher = await get_teacher(db, teacher_id)
    if data.employee_id:
        teacher.employee_id = data.employee_id
    if data.name:
        teacher.user.name = data.name
    await db.commit()
    await db.refresh(teacher)
    return _teacher_dict(teacher)


async def delete_teacher(db: AsyncSession, teacher_id: str) -> None:
    teacher = await get_teacher(db, teacher_id)
    await db.delete(teacher)
    await db.commit()
