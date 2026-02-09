from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select
from .models import Dispute, DisputeStatus, User, AttendanceSession, AttendanceSource
from .database import engine
from .schemas import DisputeRead

class DisputeService:
    def create_dispute(
        self, 
        student_username: str, 
        session_id: int, 
        description: str,
        attendance_source_id: Optional[int] = None,
        selected_face_coords: Optional[List[int]] = None
    ) -> Dispute:
        with Session(engine) as session:
            existing = session.exec(select(Dispute).where(
                Dispute.student_username == student_username,
                Dispute.session_id == session_id
            )).first()
            
            if existing:
                return existing

            coords_str = str(selected_face_coords) if selected_face_coords else None
            dispute = Dispute(
                student_username=student_username,
                session_id=session_id,
                description=description,
                attendance_source_id=attendance_source_id,
                selected_face_coords=coords_str
            )
            session.add(dispute)
            session.commit()
            session.refresh(dispute)
            return dispute

    def get_my_disputes(self, student_username: str) -> List[DisputeRead]:
        with Session(engine) as session:
            statement = select(Dispute, AttendanceSource, AttendanceSession).where(
                Dispute.student_username == student_username
            ).join(AttendanceSession, Dispute.session_id == AttendanceSession.id
            ).outerjoin(AttendanceSource, Dispute.attendance_source_id == AttendanceSource.id
            ).order_by(Dispute.created_at.desc())
            
            results = session.exec(statement).all()
            
            disputes = []
            for d, source, sess in results:
                # convert sqlmodel to dict to create Pydantic model
                d_dict = d.dict()
                dr = DisputeRead(**d_dict)
                if source:
                    dr.evidence_path = source.file_path
                if sess:
                    dr.session_name = sess.name
                disputes.append(dr)
            return disputes

    def get_all_disputes(self) -> List[DisputeRead]:
        with Session(engine) as session:
            statement = select(Dispute, AttendanceSource, AttendanceSession).join(
                AttendanceSession, Dispute.session_id == AttendanceSession.id
            ).outerjoin(AttendanceSource, Dispute.attendance_source_id == AttendanceSource.id
            ).order_by(Dispute.created_at.desc())
            
            results = session.exec(statement).all()
            
            disputes = []
            for d, source, sess in results:
                d_dict = d.dict()
                dr = DisputeRead(**d_dict)
                if source:
                    dr.evidence_path = source.file_path
                if sess:
                    dr.session_name = sess.name
                disputes.append(dr)
            return disputes

    def resolve_dispute(self, dispute_id: int, status: DisputeStatus) -> Optional[Dispute]:
        with Session(engine) as session:
            dispute = session.get(Dispute, dispute_id)
            if not dispute:
                return None
            
            dispute.status = status
            session.add(dispute)
            session.commit()
            session.refresh(dispute)
            return dispute
