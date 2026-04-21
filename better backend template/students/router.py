from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from students import service
from students.schema import StudentCreate, StudentUpdate, StudentResponse, FaceEnrollResponse

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("/", response_model=StudentResponse)
async def create_student(
    body: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await service.create_student(db, body)


@router.get("/", response_model=List[StudentResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "teacher")),
):
    return await service.get_all_students(db)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.get_student_dict(db, student_id)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str,
    body: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await service.update_student(db, student_id, body)


@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    await service.delete_student(db, student_id)


@router.post("/{student_id}/faces", response_model=FaceEnrollResponse)
async def enroll_face(
    student_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "teacher")),
):
    from fastapi import HTTPException
    from sqlalchemy import select
    from ai.pipeline import pipeline
    from storage.s3_service import s3_service
    from ai.vector_index.embedding_cache import invalidate
    from classes.model import ClassStudent

    image_bytes = await file.read()

    # Detect face first — before touching S3
    try:
        faces = pipeline.detector.detect_faces_raw(image_bytes)
    except (ValueError, Exception) as exc:
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")

    if not faces:
        raise HTTPException(status_code=422, detail="No face detected in the uploaded image")

    # Only upload to S3 if face detection succeeded
    s3_key = f"faces/{student_id}/{file.filename}"
    image_url = await s3_service.upload_image(image_bytes, s3_key, file.content_type or "image/jpeg")

    embedding = pipeline.embedder.generate_embedding(faces[0])
    face = await service.enroll_face(db, student_id, embedding.tolist(), image_url)

    # Invalidate FAISS cache for every class this student belongs to
    # so the next recognition request rebuilds with the new embedding
    try:
        cs_result = await db.execute(
            select(ClassStudent).where(ClassStudent.student_id == student_id)
        )
        for cs in cs_result.scalars().all():
            invalidate(cs.class_id)
    except Exception:
        pass  # Cache invalidation failure is non-fatal

    return face

