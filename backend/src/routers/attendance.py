from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import get_current_user, attendance_service
from ..models import User, AttendanceRecord

from ..dependencies import get_current_user, attendance_service, allow_teacher_admin

router = APIRouter(tags=["attendance"])

@router.get("/attendance", response_model=List[AttendanceRecord])
def get_all_attendance(limit: int = 100, current_user: User = Depends(allow_teacher_admin)):
    return attendance_service.get_all_records(limit)

@router.post("/attendance/manual", response_model=AttendanceRecord)
def manual_mark_attendance(
    student_name: str, 
    session_id: int, 
    current_user: User = Depends(allow_teacher_admin)
):
    # Manual mark logic
    record = attendance_service.mark_attendance(
        student_name, 
        confidence=1.0, 
        session_id=session_id, 
        metadata={"source": "manual_override", "marked_by": current_user.username}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Could not mark attendance (Duplicate or Invalid Session)")
    return record


@router.get("/attendance/my", response_model=List[AttendanceRecord])
def get_my_attendance(current_user: User = Depends(get_current_user)):
    aliases = []
    if current_user.face_identity:
        aliases.append(current_user.face_identity)
        
    return attendance_service.get_student_history(current_user.username, aliases)

@router.get("/attendance/absent", response_model=List[str])
def get_absentees_for_active_session(current_user: User = Depends(get_current_user)): # Teacher only?
    # Logic from main.py? 
    # Ah, main.py didn't have this explicitly in the snippet I saw, 
    # but frontend calls /attendance/absent.
    # Let's check main.py again if I missed it, or implement it afresh.
    # It was likely using `attendance_service.get_absentees_for_session`.
    
    session = attendance_service.get_active_session()
    if not session:
        return []
    
    # We need all students list.
    # Ideally should inject Session.
    # I'll import get_session and use it.
    from ..dependencies import get_session
    from sqlmodel import select
    from ..models import User, UserRole
    from ..database import engine
    from sqlmodel import Session as SQLSession

    with SQLSession(engine) as db:
        users = db.exec(select(User).where(User.role == UserRole.STUDENT)).all()
        students = [u.username for u in users]

    return attendance_service.get_absentees_for_session(session.id, students)
