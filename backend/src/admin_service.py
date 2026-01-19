from datetime import datetime
from typing import List, Optional, Dict
import json
from sqlmodel import Session, select
from .models import AuditLog, User
from .database import engine

class AdminService:
    def log_action(self, actor_username: str, action: str, target_id: Optional[str] = None, details: Optional[Dict] = None) -> AuditLog:
        with Session(engine) as session:
            log = AuditLog(
                actor_username=actor_username,
                action=action,
                target_id=target_id,
                details=json.dumps(details) if details else None
            )
            session.add(log)
            session.commit()
            session.refresh(log)
            return log

    def get_audit_logs(self, limit: int = 100) -> List[AuditLog]:
        with Session(engine) as session:
            return session.exec(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)).all()
