from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..dependencies import (
    get_session,
    get_current_user,
    allow_teacher_admin,
    get_attendance_service,
)
from ..models import AttendanceSession, AttendanceRecord, User, UserRole, AttendanceSource
from ..schemas import SessionReportResponse
from ..attendance import AttendanceService

router = APIRouter(tags=["sessions"])


@router.get("/sessions", response_model=List[AttendanceSession])
def get_sessions(
    current_user: User = Depends(get_current_user),
    svc: AttendanceService = Depends(get_attendance_service),
):
    return svc.get_session_history()


@router.post("/sessions", response_model=AttendanceSession)
def create_session(
    name: str,
    class_id: int,
    current_user: User = Depends(allow_teacher_admin),
    svc: AttendanceService = Depends(get_attendance_service),
):
    return svc.create_session(name, class_id)


@router.get("/sessions/active", response_model=AttendanceSession)
def get_active_session(
    current_user: User = Depends(get_current_user),
    svc: AttendanceService = Depends(get_attendance_service),
):
    session = svc.get_active_session()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session


@router.post("/sessions/end", response_model=AttendanceSession)
def end_active_session(
    current_user: User = Depends(allow_teacher_admin),
    svc: AttendanceService = Depends(get_attendance_service),
):
    result = svc.end_active_session()
    if not result:
        raise HTTPException(status_code=400, detail="No active session to end")
    return result


@router.get("/sessions/{session_id}/report", response_model=SessionReportResponse)
def get_session_report(
    session_id: int,
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
    svc: AttendanceService = Depends(get_attendance_service),
):
    users = session.exec(select(User).where(User.role == UserRole.STUDENT)).all()
    students = [u.username for u in users]
    return svc.get_session_report(session_id, students)


@router.get("/sessions/active/unknowns")
def get_active_session_unknowns(
    current_user: User = Depends(get_current_user),
    svc: AttendanceService = Depends(get_attendance_service),
):
    active = svc.get_active_session()
    if not active:
        return []
    return svc.get_unknowns(active.id)


@router.get("/sessions/{session_id}/evidence")
def get_session_evidence(
    session_id: int,
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(AttendanceSource)
        .where(AttendanceSource.session_id == session_id)
        .order_by(AttendanceSource.timestamp.desc())
    ).all()
