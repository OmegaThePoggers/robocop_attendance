from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..dependencies import (
    get_session, 
    get_current_user, 
    allow_teacher_admin, 
    attendance_service,
)
from ..models import AttendanceSession, AttendanceRecord, User, UserRole

router = APIRouter(tags=["sessions"])

@router.get("/sessions", response_model=List[AttendanceSession])
def get_sessions(current_user: User = Depends(get_current_user)):
     return attendance_service.get_session_history()

@router.post("/sessions", response_model=AttendanceSession)
def create_session(name: str, current_user: User = Depends(allow_teacher_admin)):
    return attendance_service.create_session(name)

@router.get("/sessions/active", response_model=AttendanceSession)
def get_active_session(current_user: User = Depends(get_current_user)): 
    session = attendance_service.get_active_session()
    # Frontend handles 404 cleanly? 
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session

@router.post("/sessions/end", response_model=AttendanceSession)
def end_active_session(current_user: User = Depends(allow_teacher_admin)):
    result = attendance_service.end_active_session()
    if not result:
        raise HTTPException(status_code=400, detail="No active session to end")
    return result

@router.get("/sessions/{session_id}/report")
def get_session_report(session_id: int, current_user: User = Depends(allow_teacher_admin), session: Session = Depends(get_session)):
    # Get all students (fetch User objects to ensure we get strings)
    # Using the passed 'session' from DI
    users = session.exec(select(User).where(User.role == UserRole.STUDENT)).all()
    students = [u.username for u in users]
    
    return attendance_service.get_session_report(session_id, students)

@router.get("/sessions/active/unknowns")
def get_active_session_unknowns(current_user: User = Depends(get_current_user)):
    session = attendance_service.get_active_session()
    if not session:
        return []
    return attendance_service.get_unknowns(session.id)

@router.get("/sessions/{session_id}/evidence")
def get_session_evidence(session_id: int, current_user: User = Depends(allow_teacher_admin), session: Session = Depends(get_session)):
    from ..models import AttendanceSource
    return session.exec(select(AttendanceSource).where(AttendanceSource.session_id == session_id).order_by(AttendanceSource.timestamp.desc())).all()
