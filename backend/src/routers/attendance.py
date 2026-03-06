from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..dependencies import (
    get_current_user,
    get_session,
    allow_teacher_admin,
    get_attendance_service,
)
from ..models import User, AttendanceRecord, UserRole
from ..attendance import AttendanceService

router = APIRouter(tags=["attendance"])


@router.get("/attendance", response_model=List[AttendanceRecord])
def get_all_attendance(
    limit: int = 100,
    current_user: User = Depends(allow_teacher_admin),
    svc: AttendanceService = Depends(get_attendance_service),
):
    return svc.get_all_records(limit)


@router.post("/attendance/manual", response_model=AttendanceRecord)
def manual_mark_attendance(
    student_name: str,
    session_id: int,
    current_user: User = Depends(allow_teacher_admin),
    svc: AttendanceService = Depends(get_attendance_service),
):
    record = svc.mark_attendance(
        student_name,
        confidence=1.0,
        session_id=session_id,
        metadata={"source": "manual_override", "marked_by": current_user.username},
    )
    if not record:
        raise HTTPException(
            status_code=400,
            detail="Could not mark attendance (Duplicate or Invalid Session)",
        )
    return record


@router.get("/attendance/my", response_model=List[AttendanceRecord])
def get_my_attendance(
    current_user: User = Depends(get_current_user),
    svc: AttendanceService = Depends(get_attendance_service),
):
    aliases = []
    if current_user.face_identity:
        aliases.append(current_user.face_identity)
    return svc.get_student_history(current_user.username, aliases, class_id=current_user.class_id)


@router.get("/attendance/absent", response_model=List[str])
def get_absentees_for_active_session(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    svc: AttendanceService = Depends(get_attendance_service),
):
    active = svc.get_active_session()
    if not active:
        return []

    if active.class_id:
        users = session.exec(
            select(User).where(User.role == UserRole.STUDENT, User.class_id == active.class_id)
        ).all()
    else:
        users = session.exec(select(User).where(User.role == UserRole.STUDENT)).all()

    students = [u.username for u in users]
    return svc.get_absentees_for_session(active.id, students)
