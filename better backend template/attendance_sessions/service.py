import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from attendance_sessions.model import (
    AttendanceSession, AttendanceRecord, SessionStatus, AttendanceStatus
)
from attendance_sessions.schema import SessionCreate, OverrideRequest
from classes.model import ClassStudent


async def create_session(db: AsyncSession, data: SessionCreate, teacher_id: str) -> AttendanceSession:
    session = AttendanceSession(
        id=str(uuid.uuid4()),
        class_id=data.class_id,
        teacher_id=teacher_id,
        status=SessionStatus.created,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: str) -> AttendanceSession:
    result = await db.execute(select(AttendanceSession).where(AttendanceSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


async def upload_photo(
    db: AsyncSession, session_id: str, file: UploadFile, teacher_id: str
) -> AttendanceSession:
    from storage.s3_service import s3_service
    from workers.tasks import recognize_faces_task

    session = await get_session(db, session_id)

    if session.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != SessionStatus.created:
        raise HTTPException(status_code=400, detail="Session already has a photo uploaded")

    image_bytes = await file.read()
    s3_key = f"sessions/{session_id}/{file.filename}"
    image_url = await s3_service.upload_image(
        image_bytes=image_bytes,
        s3_key=s3_key,
        content_type=file.content_type or "image/jpeg",
    )

    session.image_url = image_url
    session.status = SessionStatus.processing
    await db.commit()

    # Enqueue async recognition task
    recognize_faces_task.delay(session_id, s3_key)

    await db.refresh(session)
    return session


async def apply_recognition_results(
    db: AsyncSession, session_id: str, results: List[dict]
) -> None:
    session = await get_session(db, session_id)

    # Gather all students in the class
    cs_result = await db.execute(
        select(ClassStudent).where(ClassStudent.class_id == session.class_id)
    )
    all_student_ids = {cs.student_id for cs in cs_result.scalars().all()}

    # Map student_id → confidence for confirmed matches
    matched: dict = {}
    for r in results:
        if r.get("student_id") and r.get("status") == "confirmed":
            matched[r["student_id"]] = r["confidence"]

    for student_id in all_student_ids:
        record = AttendanceRecord(
            id=str(uuid.uuid4()),
            session_id=session_id,
            student_id=student_id,
            status=AttendanceStatus.present if student_id in matched else AttendanceStatus.absent,
            confidence=matched.get(student_id, 0.0),
            overridden_by_teacher=False,
        )
        db.add(record)

    session.status = SessionStatus.review
    session.processed_at = datetime.now(timezone.utc)
    await db.commit()


async def teacher_override(
    db: AsyncSession, session_id: str, override: OverrideRequest, teacher_id: str
) -> AttendanceRecord:
    session = await get_session(db, session_id)

    if session.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != SessionStatus.review:
        raise HTTPException(status_code=400, detail="Session must be in 'review' state for overrides")

    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == override.student_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    record.status = override.new_status
    record.overridden_by_teacher = True
    await db.commit()
    await db.refresh(record)
    return record


async def confirm_session(
    db: AsyncSession, session_id: str, teacher_id: str
) -> AttendanceSession:
    session = await get_session(db, session_id)

    if session.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != SessionStatus.review:
        raise HTTPException(status_code=400, detail="Session must be in 'review' state to confirm")

    session.status = SessionStatus.locked
    session.confirmed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session_results(db: AsyncSession, session_id: str) -> dict:
    session = await get_session(db, session_id)

    rec_result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
    )
    records = list(rec_result.scalars().all())

    present_statuses = {AttendanceStatus.present, AttendanceStatus.overridden_present}
    present_count = sum(1 for r in records if r.status in present_statuses)

    return {
        "session": session,
        "records": records,
        "total_students": len(records),
        "present_count": present_count,
        "absent_count": len(records) - present_count,
    }
