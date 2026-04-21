import uuid
from typing import List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from classes.model import Class, ClassStudent
from classes.schema import ClassCreate, ClassUpdate


async def create_class(db: AsyncSession, data: ClassCreate, teacher_id: str) -> Class:
    cls = Class(id=str(uuid.uuid4()), name=data.name, subject=data.subject, teacher_id=teacher_id)
    db.add(cls)
    await db.commit()
    await db.refresh(cls)
    return cls


async def get_class(db: AsyncSession, class_id: str) -> Class:
    result = await db.execute(select(Class).where(Class.id == class_id))
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls


async def get_all_classes(db: AsyncSession) -> List[Class]:
    result = await db.execute(select(Class))
    return list(result.scalars().all())


async def update_class(db: AsyncSession, class_id: str, data: ClassUpdate) -> Class:
    cls = await get_class(db, class_id)
    if data.name:
        cls.name = data.name
    if data.subject is not None:
        cls.subject = data.subject
    await db.commit()
    await db.refresh(cls)
    return cls


async def delete_class(db: AsyncSession, class_id: str) -> None:
    cls = await get_class(db, class_id)
    await db.delete(cls)
    await db.commit()


async def add_student(db: AsyncSession, class_id: str, student_id: str) -> ClassStudent:
    existing = await db.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == class_id, ClassStudent.student_id == student_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Student already enrolled in this class")

    enrollment = ClassStudent(class_id=class_id, student_id=student_id)
    db.add(enrollment)
    await db.commit()
    return enrollment


async def remove_student(db: AsyncSession, class_id: str, student_id: str) -> None:
    result = await db.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == class_id, ClassStudent.student_id == student_id
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Student not enrolled in this class")
    await db.delete(enrollment)
    await db.commit()


async def get_class_students(db: AsyncSession, class_id: str) -> List[ClassStudent]:
    result = await db.execute(select(ClassStudent).where(ClassStudent.class_id == class_id))
    return list(result.scalars().all())
