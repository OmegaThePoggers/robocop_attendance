from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from sqlalchemy import func
from datetime import datetime, timedelta
import os
import glob

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
    # Cognify models
    Doubt,
    DoubtMessage,
    Assignment,
    Submission,
    Notification,
    Resource,
    Schedule,
    DirectMessage,
    SubjectMark,
    StudentFace,
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
    AdminCreateUser,
    AdminBatchCreateRequest,
    AdminBatchCreateResponse,
    AdminBatchDeleteRequest,
    AdminRoleUpdateRequest,
)
from ..admin_service import AdminService
from ..auth_service import get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])

DEFAULT_PASSWORD = "robocop"


# --- Account Management ---

def _create_single_user(data: AdminCreateUser, session: Session) -> User:
    """Create a single user from AdminCreateUser schema. Returns the User object."""
    import json
    subjects_json = None
    if data.subjects:
        subject_list = [s.strip() for s in data.subjects.split(",") if s.strip()]
        subjects_json = json.dumps(subject_list)

    db_user = User(
        username=data.username,
        password_hash=get_password_hash(DEFAULT_PASSWORD),
        role=UserRole(data.role),
        full_name=data.full_name,
        email=data.email,
        department=data.department,
        sap_id=data.sap_id,
        roll_number=data.roll_number,
        course=data.course,
        subjects_json=subjects_json,
    )
    session.add(db_user)
    return db_user


def _cleanup_user_data(username: str, session: Session):
    """Delete all records in other tables that reference this user's username."""
    # 1. DoubtMessages (by doubt_id or sender_username)
    # First find doubts where user is involved
    user_doubts = session.exec(select(Doubt).where((Doubt.student_username == username) | (Doubt.teacher_username == username))).all()
    for doubt in user_doubts:
        # Delete messages for this doubt
        msgs = session.exec(select(DoubtMessage).where(DoubtMessage.doubt_id == doubt.id)).all()
        for m in msgs: session.delete(m)
    
    # 2. Doubts themselves
    for doubt in user_doubts: session.delete(doubt)
    
    # 3. Submissions
    subs = session.exec(select(Submission).where(Submission.student_username == username)).all()
    for s in subs: session.delete(s)
    
    # 4. Assignments (if teacher) - must delete submissions first if assignment is deleted
    asgs = session.exec(select(Assignment).where(Assignment.teacher_username == username)).all()
    for a in asgs:
        # Cleanup submissions for this assignment
        a_subs = session.exec(select(Submission).where(Submission.assignment_id == a.id)).all()
        for s in a_subs: session.delete(s)
        session.delete(a)
        
    # 5. StudentFace
    faces = session.exec(select(StudentFace).where(StudentFace.student_id == username)).all()
    for f in faces: session.delete(f)
    
    # 6. Dispute
    disps = session.exec(select(Dispute).where(Dispute.student_username == username)).all()
    for d in disps: session.delete(d)
    
    # 7. AuditLog
    logs = session.exec(select(AuditLog).where(AuditLog.actor_username == username)).all()
    for l in logs: session.delete(l)
    
    # 8. Notification
    notifs = session.exec(select(Notification).where(Notification.user_username == username)).all()
    for n in notifs: session.delete(n)
    
    # 9. Resource
    ress = session.exec(select(Resource).where(Resource.uploaded_by == username)).all()
    for r in ress: session.delete(r)
    
    # 10. Schedule
    schs = session.exec(select(Schedule).where(Schedule.teacher_username == username)).all()
    for sch in schs: session.delete(sch)
    
    # 11. DirectMessages
    dms = session.exec(select(DirectMessage).where((DirectMessage.sender_username == username) | (DirectMessage.recipient_username == username))).all()
    for dm in dms: session.delete(dm)
    
    # 12. SubjectMark
    marks = session.exec(select(SubjectMark).where(SubjectMark.student_username == username)).all()
    for mk in marks: session.delete(mk)


@router.post("/users")
def admin_create_user(
    data: AdminCreateUser,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    existing = session.exec(select(User).where(User.username == data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{data.username}' already exists")
    user = _create_single_user(data, session)
    session.commit()
    session.refresh(user)
    return {"status": "created", "username": user.username, "id": user.id}


@router.post("/users/batch", response_model=AdminBatchCreateResponse)
def admin_batch_create_users(
    req: AdminBatchCreateRequest,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    existing_usernames = {
        u.username for u in session.exec(select(User)).all()
    }
    created = []
    skipped = []
    for data in req.users:
        if data.username in existing_usernames:
            skipped.append(data.username)
            continue
        _create_single_user(data, session)
        existing_usernames.add(data.username)
        created.append(data.username)
    session.commit()
    return AdminBatchCreateResponse(created=created, skipped=skipped)


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Cleanup related data first
    _cleanup_user_data(user.username, session)
    
    session.delete(user)
    session.commit()
    return {"status": "deleted", "username": user.username}


@router.delete("/users/batch")
def admin_batch_delete_users(
    req: AdminBatchDeleteRequest,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    deleted = []
    for uid in req.user_ids:
        if uid == current_user.id:
            continue
        user = session.get(User, uid)
        if user:
            deleted.append(user.username)
            # Cleanup related data
            _cleanup_user_data(user.username, session)
            session.delete(user)
    session.commit()
    return {"status": "deleted", "deleted": deleted}


@router.put("/users/{user_id}/role")
def admin_update_role(
    user_id: int,
    req: AdminRoleUpdateRequest,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = UserRole(req.role)
    session.commit()
    return {"status": "updated", "username": user.username, "role": user.role}


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    current_user: User = Depends(allow_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = get_password_hash(DEFAULT_PASSWORD)
    session.commit()
    return {"status": "password_reset", "username": user.username}


@router.get("/users/{username}/photo")
def admin_get_user_photo(
    username: str,
    current_user: User = Depends(allow_admin),
):
    dataset_dir = os.getenv("DATASET_PATH")
    if not dataset_dir:
        dataset_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "dataset",
        )
    
    photo_path = os.path.join(dataset_dir, username, "selfie.jpg")
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return FileResponse(photo_path)



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


@router.get("/student-photo/{username}")
def get_student_photo(
    username: str,
    current_user: User = Depends(allow_teacher_admin),
):
    """Serve the enrolled face photo for a student from the dataset directory."""
    dataset_dir = os.getenv("DATASET_PATH", "dataset")
    student_dir = os.path.join(dataset_dir, username)

    if not os.path.isdir(student_dir):
        raise HTTPException(status_code=404, detail="No enrolled photo found")

    # Find the first image file in the student's directory
    for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
        matches = glob.glob(os.path.join(student_dir, ext))
        if matches:
            return FileResponse(matches[0], media_type="image/png")

    raise HTTPException(status_code=404, detail="No enrolled photo found")
