import uuid
from typing import List, Any, Dict

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from auth.model import User, UserRole
from students.model import Student, StudentFace
from students.schema import StudentCreate, StudentUpdate
from core.security import hash_password


def _student_dict(student: Student) -> Dict[str, Any]:
    return {
        "id": student.id,
        "user_id": student.user_id,
        "sap_id": student.sap_id,
        "name": student.user.name,
        "email": student.user.email,
    }


async def create_student(db: AsyncSession, data: StudentCreate) -> Dict[str, Any]:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.student,
        name=data.name,
    )
    db.add(user)
    await db.flush()

    student = Student(id=str(uuid.uuid4()), user_id=user.id, sap_id=data.sap_id)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    await db.refresh(student, ["user"])
    return _student_dict(student)


async def get_student(db: AsyncSession, student_id: str) -> Student:
    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


async def get_student_dict(db: AsyncSession, student_id: str) -> Dict[str, Any]:
    return _student_dict(await get_student(db, student_id))


async def get_all_students(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(select(Student).options(selectinload(Student.user)))
    return [_student_dict(s) for s in result.scalars().all()]


async def update_student(db: AsyncSession, student_id: str, data: StudentUpdate) -> Dict[str, Any]:
    student = await get_student(db, student_id)
    if data.sap_id:
        student.sap_id = data.sap_id
    if data.name:
        student.user.name = data.name
    await db.commit()
    await db.refresh(student)
    return _student_dict(student)


async def delete_student(db: AsyncSession, student_id: str) -> None:
    student = await get_student(db, student_id)
    await db.delete(student)
    await db.commit()


async def enroll_face(
    db: AsyncSession,
    student_id: str,
    embedding: list,
    image_url: str | None = None,
) -> StudentFace:
    face = StudentFace(
        id=str(uuid.uuid4()),
        student_id=student_id,
        image_url=image_url,
    )
    db.add(face)
    await db.flush()
    await db.execute(
        text("UPDATE student_faces SET embedding = :emb::vector WHERE id = :id"),
        {"emb": str(embedding), "id": face.id},
    )
    await db.commit()
    await db.refresh(face)
    return face
