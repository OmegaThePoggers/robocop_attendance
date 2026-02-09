from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional, List, Dict
from sqlmodel import Session, select
from datetime import timedelta, datetime

# Limiters
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

from .embedding_loader import EmbeddingLoader
from .recognition import RecognitionService
from .video_processor import VideoProcessor
from .database import create_db_and_tables, engine
from .attendance import AttendanceService
from .dispute_service import DisputeService
from .admin_service import AdminService
from .models import AttendanceRecord, User, UserRole, Dispute, DisputeStatus, DisputeCreate, AuditLog, AttendanceSource, UserCreate, UnknownFace, AttendanceSession
from .schemas import MapUserRequest, DisputeRead
from .auth_service import (
    create_access_token,
    verify_password,
    get_password_hash,
    get_current_user,
    RoleChecker,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

import shutil
import tempfile
import os
import uuid
import cv2
import numpy as np
from fastapi.staticfiles import StaticFiles

# ... (rest of imports)

app = FastAPI(title="Robocop Attendance System", version="2.0")

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directories exist
for dir_path in ["static/unknowns", "static/evidence"]:
    os.makedirs(dir_path, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Service Singletons
embedding_loader: Optional[EmbeddingLoader] = None
recognition_service: Optional[RecognitionService] = None
video_processor: Optional[VideoProcessor] = None

attendance_service = AttendanceService()
dispute_service = DisputeService()
admin_service = AdminService()

# Role Checkers
allow_admin = RoleChecker([UserRole.ADMIN])
allow_teacher = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_teacher_kiosk = RoleChecker([UserRole.TEACHER, UserRole.ADMIN, UserRole.KIOSK])

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == form_data.username)).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role.value},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}


@app.get("/disputes/my", response_model=List[DisputeRead])
def get_my_disputes(current_user: User = Depends(get_current_user)):
    try:
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        return dispute_service.get_my_disputes(current_user.username)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/disputes", response_model=List[DisputeRead])
def get_all_disputes(current_user: User = Depends(allow_teacher_admin)):
    try:
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        return dispute_service.get_all_disputes()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Admin & Audit System

@app.get("/admin/users", response_model=List[User])
def get_all_users(current_user: User = Depends(allow_admin)):
    with Session(engine) as session:
        return session.exec(select(User)).all()

@app.post("/admin/map-identity")
def map_user_identity(request: MapUserRequest, current_user: User = Depends(allow_admin)):
    with Session(engine) as session:
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

@app.get("/admin/audit-logs", response_model=List[AuditLog])
def get_audit_logs(current_user: User = Depends(allow_admin)):
    if not admin_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return admin_service.get_audit_logs()

@app.post("/admin/cleanup")
def cleanup_media(days: int = 30, current_user: User = Depends(allow_admin)):
    """
    Deletes UnknownFace images older than 'days' and removes corresponding DB records.
    """
    if not attendance_service:
         raise HTTPException(status_code=500, detail="Services not initialized")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    count = 0
    deleted_files = 0
    
    with Session(engine) as session:
        # Find old records
        statement = select(UnknownFace).where(UnknownFace.timestamp < cutoff_date)
        results = session.exec(statement).all()
        
        for face in results:
            # Delete file
            # Path stored as "unknowns/filename.jpg"
            # Full path: static/unknowns/filename.jpg
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

@app.on_event("startup")
async def startup_event():
    global embedding_loader, recognition_service, video_processor
    # Initialize services
    embedding_loader = EmbeddingLoader()
    # Load known faces
    embedding_loader.load_embeddings()
    
    recognition_service = RecognitionService(embedding_loader)
    video_processor = VideoProcessor(recognition_service)
    
    # Create DB
    create_db_and_tables()

@app.post("/recognize/image")
async def recognize_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin)
):
    if not recognition_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    try:
        start_time = datetime.utcnow()
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
             raise HTTPException(status_code=400, detail="Invalid image file")

        # Convert to RGB for face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Recognize
        results = recognition_service.recognize_image(rgb_img)
        
        # Process results
        for res in results:
            name = res['name']
            if session_id:
                if name != "Unknown":
                    # Mark attendance
                    if attendance_service:
                        attendance_service.mark_attendance(
                            name, 
                            1.0 - res['distance'], 
                            session_id,
                            metadata={"source": "live_camera"}
                        )
                else:
                    # Register Unknown
                    # Save image to static/unknowns
                    if attendance_service:
                         # Generate filename
                         filename = f"unknown_{uuid.uuid4()}.jpg"
                         filepath = os.path.join("static/unknowns", filename)
                         cv2.imwrite(filepath, img) # Save original BGR
                         attendance_service.register_unknown(session_id, f"unknowns/{filename}", 1.0 - res['distance'])
        
        return {"faces": results}
    except Exception as e:
        print(f"Error in recognize_image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-faces")
async def detect_faces_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(allow_teacher_admin)
):
    if not recognition_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    locations = recognition_service.detect_only(rgb_img)
    # Format: [top, right, bottom, left]
    return {"faces": [{"bounding_box": loc} for loc in locations]}

@app.post("/recognize/video")
async def recognize_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin)
):
    if not video_processor:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    # Save temp file
    temp_file = f"temp_{uuid.uuid4()}.mp4"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        results = video_processor.process_video(temp_file)
        
        # Mark attendance for verified identities
        if session_id and attendance_service:
            for name in results["identities"]:
                 if name != "Unknown":
                     attendance_service.mark_attendance(name, 1.0, session_id, metadata={"source": "video_upload"})
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
@app.get("/attendance/my", response_model=List[AttendanceRecord])
def get_my_attendance(current_user: User = Depends(get_current_user)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    aliases = []
    if current_user.face_identity:
        aliases.append(current_user.face_identity)
        
    return attendance_service.get_student_history(current_user.username, aliases)

@app.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user)):
     return attendance_service.get_session_history()

@app.post("/sessions")
def create_session(name: str, current_user: User = Depends(allow_teacher_admin)):
    return attendance_service.create_session(name)

@app.get("/sessions/active")
def get_active_session(current_user: User = Depends(get_current_user)): # Allow students to see active session? Yes for dashboard check.
    # Note: frontend api.js getActiveSession handles 404/null.
    session = attendance_service.get_active_session()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session

@app.post("/sessions/end")
def end_active_session(current_user: User = Depends(allow_teacher_admin)):
    return attendance_service.end_active_session()

@app.get("/sessions/{session_id}/report")
def get_session_report(session_id: int, current_user: User = Depends(allow_teacher_admin)):
    with Session(engine) as session:
        # Get all students (fetch User objects to ensure we get strings)
        users = session.exec(select(User).where(User.role == UserRole.STUDENT)).all()
        students = [u.username for u in users]
    
    return attendance_service.get_session_report(session_id, students)
