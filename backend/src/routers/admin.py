from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timedelta
import os
from ..dependencies import (
    attendance_service,
    admin_service,
    dispute_service,
    allow_admin,
    get_session
)
from ..models import User, Dispute, AuditLog, UserRole
from ..schemas import DisputeRead, MapUserRequest

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[User])
def get_all_users(current_user: User = Depends(allow_admin), session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@router.post("/map-identity")
def map_user_identity(request: MapUserRequest, current_user: User = Depends(allow_admin), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == request.username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.face_identity = request.face_identity
    session.add(user)
    session.commit()
    
    # Log action
    if admin_service:
        admin_service.log_action(
            actor_username=current_user.username,
            action="MAP_USER",
            target_id=user.username,
            details={"face_identity": request.face_identity}
        )
        
    return {"status": "success", "username": user.username, "face_identity": user.face_identity}

@router.get("/audit-logs", response_model=List[AuditLog])
def get_audit_logs(current_user: User = Depends(allow_admin)):
    if not admin_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return admin_service.get_audit_logs()

@router.post("/cleanup")
def cleanup_media(days: int = 30, current_user: User = Depends(allow_admin), session: Session = Depends(get_session)):
    # ... Logic form main.py ...
    # Reimplementing cleanly using injected session
    from ..models import UnknownFace

    cutoff_date = datetime.utcnow() - timedelta(days=days)
    count = 0
    deleted_files = 0
    
    # Find old records
    statement = select(UnknownFace).where(UnknownFace.timestamp < cutoff_date)
    results = session.exec(statement).all()
    
    for face in results:
        if face.image_path:
            full_path = os.path.join("static", face.image_path)
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                    deleted_files += 1
                except Exception as e:
                    print(f"Failed to delete {full_path}: {e}")
        
        session.delete(face)
        count += 1
        
    session.commit()
    
    # Log action
    if admin_service:
        admin_service.log_action(
            actor_username=current_user.username,
            action="CLEANUP_MEDIA",
            details={"days": days, "records_deleted": count, "files_deleted": deleted_files}
        )
            
    return {"status": "success", "records_deleted": count, "files_deleted": deleted_files}

# Dispute Management (Move here or separate router? Admin handles disputes often)
# But technically teachers handle disputes too.
# I'll put dispute routes here or in a separate dispute router.
# Let's add dispute routes to main app directly or a 'disputes' router.
# For simplicity, I'll add them here but with /disputes prefix? No, router has /admin prefix.
# Dispute routes were /disputes/my (student) and /disputes (teacher).
# I should probably make a disputes.py router.
