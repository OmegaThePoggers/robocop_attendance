from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select
from .models import Dispute, DisputeStatus, User, AttendanceSession
from .database import engine

class DisputeService:
    def create_dispute(self, student_username: str, session_id: int, description: str) -> Dispute:
        with Session(engine) as session:
            # Check if dispute already exists for this session?
            # Maybe allow multiple? Let's assume one per session for now.
            existing = session.exec(select(Dispute).where(
                Dispute.student_username == student_username,
                Dispute.session_id == session_id
            )).first()
            
            if existing:
                return existing

            dispute = Dispute(
                student_username=student_username,
                session_id=session_id,
                description=description
            )
            session.add(dispute)
            session.commit()
            session.refresh(dispute)
            return dispute

    def get_my_disputes(self, student_username: str) -> List[Dispute]:
        with Session(engine) as session:
            return session.exec(select(Dispute).where(
                Dispute.student_username == student_username
            ).order_by(Dispute.created_at.desc())).all()

    def get_all_disputes(self) -> List[Dispute]:
        with Session(engine) as session:
            return session.exec(select(Dispute).order_by(Dispute.created_at.desc())).all()

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
