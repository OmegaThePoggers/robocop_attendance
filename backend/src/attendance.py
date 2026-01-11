from datetime import datetime, timedelta
from typing import List, Optional
from sqlmodel import Session, select
from .models import AttendanceRecord, AttendanceSession
from .database import engine

class AttendanceService:
    def __init__(self):
        pass

    def create_session(self, name: str) -> AttendanceSession:
        with Session(engine) as session:
            # Deactivate any currently active sessions? 
            # For simplicity, let's say yes, only one active session at a time.
            active = session.exec(select(AttendanceSession).where(AttendanceSession.is_active == True)).all()
            for s in active:
                s.is_active = False
                session.add(s)
            
            new_session = AttendanceSession(name=name)
            session.add(new_session)
            session.commit()
            session.refresh(new_session)
            return new_session

    def get_active_session(self) -> Optional[AttendanceSession]:
        with Session(engine) as session:
             return session.exec(select(AttendanceSession).where(AttendanceSession.is_active == True)).first()

    def mark_attendance(self, student_name: str, confidence: float = 0.0, session_id: Optional[int] = None) -> Optional[AttendanceRecord]:
        """
        Marks attendance. Requires an active session ID (or finds one if not provided).
        """
        if student_name == "Unknown":
            return None

        with Session(engine) as session:
            if not session_id:
                # Find active session
                active_session = session.exec(select(AttendanceSession).where(AttendanceSession.is_active == True)).first()
                if not active_session:
                    print(f"Skipping attendance for {student_name}: No active session.")
                    return None
                session_id = active_session.id
            
            # Check for existing record IN THIS SESSION
            statement = select(AttendanceRecord).where(
                AttendanceRecord.student_name == student_name,
                AttendanceRecord.session_id == session_id
            )
            existing_record = session.exec(statement).first()

            if existing_record:
                # Already marked for this session
                return None

            # Create new record
            new_record = AttendanceRecord(student_name=student_name, confidence=confidence, session_id=session_id)
            session.add(new_record)
            session.commit()
            session.refresh(new_record)
            print(f"Attendance marked for {student_name} in session {session_id}")
            return new_record

    def get_recent_records(self, limit: int = 20) -> List[AttendanceRecord]:
        with Session(engine) as session:
            statement = select(AttendanceRecord).order_by(AttendanceRecord.timestamp.desc()).limit(limit)
            results = session.exec(statement).all()
            return results

    def get_absentees_for_session(self, session_id: int, all_students: List[str]) -> List[str]:
        with Session(engine) as session:
            statement = select(AttendanceRecord.student_name).where(
                AttendanceRecord.session_id == session_id
            ).distinct()
            
            present_students = set(session.exec(statement).all())
            all_known = set(all_students)
            
            print(f"DEBUG: Session ID: {session_id}")
            print(f"DEBUG: All Known: {all_known}")
            print(f"DEBUG: Present: {present_students}")
            
            absentees = list(all_known - present_students)
            absentees.sort()
            print(f"DEBUG: Absentees: {absentees}")
            return absentees
