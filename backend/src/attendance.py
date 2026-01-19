from datetime import datetime, timedelta
import json
from typing import List, Optional, Set, Dict
from sqlmodel import Session, select, func
from .models import AttendanceRecord, AttendanceSession, UnknownFace
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

    def end_active_session(self) -> Optional[AttendanceSession]:
        with Session(engine) as session:
            active = session.exec(select(AttendanceSession).where(AttendanceSession.is_active == True)).first()
            if active:
                active.is_active = False
                active.end_time = datetime.utcnow()
                session.add(active)
                session.commit()
                session.refresh(active)
            return active

    def get_active_session(self) -> Optional[AttendanceSession]:
        with Session(engine) as session:
             return session.exec(select(AttendanceSession).where(AttendanceSession.is_active == True)).first()

    def get_session_history(self) -> List[AttendanceSession]:
        with Session(engine) as session:
            return session.exec(select(AttendanceSession).where(AttendanceSession.is_active == False).order_by(AttendanceSession.created_at.desc())).all()

    def mark_attendance(
        self, 
        student_name: str, 
        confidence: float = 0.0, 
        session_id: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> Optional[AttendanceRecord]:
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
                # Optional: Update metadata if new confidence is better? 
                # For now, first detection wins.
                return None

            # Create new record
            metadata_str = json.dumps(metadata) if metadata else None
            new_record = AttendanceRecord(
                student_name=student_name, 
                confidence=confidence, 
                session_id=session_id,
                metadata_json=metadata_str
            )
            session.add(new_record)
            session.commit()
            session.refresh(new_record)
            print(f"Attendance marked for {student_name} in session {session_id}")
            return new_record

    def get_recent_records(self, limit: int = 50) -> List[AttendanceRecord]:
        with Session(engine) as session:
            # Only get records for the currently active session
            active = session.exec(select(AttendanceSession).where(AttendanceSession.is_active == True)).first()
            
            if not active:
                return []
                
            statement = select(AttendanceRecord).where(
                AttendanceRecord.session_id == active.id
            ).order_by(AttendanceRecord.timestamp.desc()).limit(limit)
            
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

    def get_session_report(self, session_id: int, all_students: List[str]) -> Dict[str, List[str]]:
        with Session(engine) as session:
            statement = select(AttendanceRecord.student_name).where(
                AttendanceRecord.session_id == session_id
            ).distinct()
            
            present_list = session.exec(statement).all()
            present_set = set(present_list)
            all_known = set(all_students)
            
            absent_list = list(all_known - present_set)
            
            # Sort for display
            present_sorted = sorted(list(present_set))
            absent_sorted = sorted(absent_list)
            
            return {
                "present": present_sorted,
                "absent": absent_sorted
            }

    def register_unknown(self, session_id: int, image_path: str, confidence: float = 0.0) -> UnknownFace:
        with Session(engine) as session:
            unknown = UnknownFace(
                session_id=session_id,
                image_path=image_path,
                confidence=confidence
            )
            session.add(unknown)
            session.commit()
            session.refresh(unknown)
            return unknown

    def get_unknowns(self, session_id: int) -> List[UnknownFace]:
        with Session(engine) as session:
             return session.exec(select(UnknownFace).where(
                 UnknownFace.session_id == session_id,
                 UnknownFace.is_resolved == False
             ).order_by(UnknownFace.timestamp.desc())).all()

    def resolve_unknown(self, unknown_id: int, student_name: str) -> Optional[AttendanceRecord]:
        with Session(engine) as session:
            unknown = session.get(UnknownFace, unknown_id)
            if not unknown:
                return None
            
            unknown.is_resolved = True
            unknown.resolved_to = student_name
            session.add(unknown)
            
            # Create attendance record
            record = AttendanceRecord(
                student_name=student_name,
                session_id=unknown.session_id,
                confidence=1.0, # Human verified
                metadata_json=json.dumps({"source": "manual_resolution", "original_unknown_id": unknown.id})
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            session.refresh(record)
            return record

    def get_student_history(self, student_name: str, aliases: Optional[List[str]] = None) -> List[AttendanceRecord]:
        with Session(engine) as session:
            # Check for records matching username OR face identity alias
            names_to_check = [student_name]
            if aliases:
                names_to_check.extend(aliases)
            
            return session.exec(select(AttendanceRecord).where(
                AttendanceRecord.student_name.in_(names_to_check)
            ).order_by(AttendanceRecord.timestamp.desc())).all()
