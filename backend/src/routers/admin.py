from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func
from datetime import datetime, timedelta
import os

from ..dependencies import (
    allow_admin,
    allow_teacher_admin,
    get_session,
    get_admin_service,
)
from ..models import (
    User,
    Dispute,
    AuditLog,
    UserRole,
    ClassGroup,
    AttendanceSession,
    AttendanceRecord,
    UnknownFace,
    AttendanceSource,
)
from ..schemas import (
    MapUserRequest,
    AssignClassRequest,
    ClassCreate,
    AssignClassResponse,
    ClassCreateResponse,
    MapIdentityResponse,
    CleanupResponse,
    TableDataResponse,
)
from ..admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])





# --- Endpoints ---

@router.get("/users", response_model=List[User])
def get_all_users(
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
):
    return session.exec(select(User)).all()


@router.put("/users/{user_id}/assign-class", response_model=AssignClassResponse)
def assign_user_to_class(
    user_id: int,
    request: AssignClassRequest,
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    c_group = session.get(ClassGroup, request.class_id)
    if not c_group:
        raise HTTPException(status_code=404, detail="Class Group not found")

    user.class_id = request.class_id
    session.add(user)
    session.commit()
    return AssignClassResponse(status="success", user_id=user.id, class_id=user.class_id)


@router.get("/users/students/unassigned", response_model=List[User])
def get_unassigned_students(
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(User).where(User.role == UserRole.STUDENT, User.class_id == None)
    ).all()


@router.post("/classes", response_model=ClassCreateResponse)
def create_class(
    req: ClassCreate,
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
):
    new_class = ClassGroup(name=req.name, description=req.description)
    session.add(new_class)
    session.commit()
    session.refresh(new_class)
    return ClassCreateResponse(id=new_class.id, name=new_class.name)


@router.get("/classes")
def get_classes(
    current_user: User = Depends(allow_teacher_admin),
    session: Session = Depends(get_session),
):
    return session.exec(select(ClassGroup)).all()


@router.post("/map-identity", response_model=MapIdentityResponse)
def map_user_identity(
    request: MapUserRequest,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
    admin_svc: AdminService = Depends(get_admin_service),
):
    user = session.exec(select(User).where(User.username == request.username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.face_identity = request.face_identity
    session.add(user)
    session.commit()

    admin_svc.log_action(
        actor_username=current_user.username,
        action="MAP_USER",
        target_id=user.username,
        details={"face_identity": request.face_identity},
    )

    return MapIdentityResponse(status="success", username=user.username, face_identity=user.face_identity)


@router.get("/audit-logs", response_model=List[AuditLog])
def get_audit_logs(
    current_user: User = Depends(allow_admin),
    admin_svc: AdminService = Depends(get_admin_service),
):
    return admin_svc.get_audit_logs()


@router.post("/cleanup", response_model=CleanupResponse)
def cleanup_media(
    days: int = 30,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
    admin_svc: AdminService = Depends(get_admin_service),
):
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    count = 0
    deleted_files = 0

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

    admin_svc.log_action(
        actor_username=current_user.username,
        action="CLEANUP_MEDIA",
        details={"days": days, "records_deleted": count, "files_deleted": deleted_files},
    )

    return CleanupResponse(status="success", records_deleted=count, files_deleted=deleted_files)


@router.get("/database/tables")
def get_database_tables(current_user: User = Depends(allow_admin)):
    return [
        "user", "classgroup", "attendancesession",
        "attendancerecord", "unknownface", "attendancesource",
        "dispute", "auditlog",
    ]


@router.get("/database/{table_name}")
def get_table_data(
    table_name: str,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    model_map = {
        "user": User,
        "classgroup": ClassGroup,
        "attendancesession": AttendanceSession,
        "attendancerecord": AttendanceRecord,
        "unknownface": UnknownFace,
        "attendancesource": AttendanceSource,
        "dispute": Dispute,
        "auditlog": AuditLog,
    }

    table_name = table_name.lower()
    if table_name not in model_map:
        raise HTTPException(status_code=400, detail="Invalid table name")

    model = model_map[table_name]
    total = session.scalar(select(func.count()).select_from(model))
    statement = select(model).offset(offset).limit(limit)
    rows = session.exec(statement).all()

    return {
        "table": table_name,
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": rows,
    }
