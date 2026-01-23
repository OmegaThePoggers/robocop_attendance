from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional, List, Dict
from sqlmodel import Session, select
from datetime import timedelta
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
from .models import AttendanceRecord, User, UserRole, Dispute, DisputeStatus, DisputeCreate, AuditLog, AttendanceSource, UserCreate
from .schemas import MapUserRequest
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
from .models import UnknownFace

app = FastAPI()

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directory exists
os.makedirs("static/unknowns", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

embedding_loader: Optional[EmbeddingLoader] = None
recognition_service: Optional[RecognitionService] = None
video_processor: Optional[VideoProcessor] = None
video_processor: Optional[VideoProcessor] = None
# Stateless services can be initialized immediately
attendance_service = AttendanceService()
dispute_service = DisputeService()
admin_service = AdminService()

# Role Guards
allow_teacher_admin = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
allow_admin = RoleChecker([UserRole.ADMIN])
allow_teacher_kiosk = RoleChecker([UserRole.TEACHER, UserRole.KIOSK, UserRole.ADMIN])

@app.on_event("startup")
async def startup_event():
    global embedding_loader, recognition_service, video_processor
    print("Initializing Database...")
    create_db_and_tables()
    
    # Seed default Admin
    with Session(engine) as session:
        admin = session.exec(select(User).where(User.username == "admin")).first()
        if not admin:
            print("Seeding default admin user...")
            hashed_pwd = get_password_hash("robocop")
            admin_user = User(
                username="admin", 
                password_hash=hashed_pwd, 
                role=UserRole.ADMIN,
                full_name="System Administrator"
            )
            session.add(admin_user)
            session.commit()
            print("Default admin created: admin / robocop")

            session.add(admin_user)
            session.commit()
            print("Default admin created: admin / robocop")
        
        # Seed default Student
        student = session.exec(select(User).where(User.username == "student")).first()
        if not student:
            print("Seeding default student user...")
            hashed_pwd = get_password_hash("robocop")
            student_user = User(
                username="student", 
                password_hash=hashed_pwd, 
                role=UserRole.STUDENT,
                full_name="Test Student"
            )
            session.add(student_user)
            session.commit()
            print("Default student created: student / robocop")

    print("Database initialized.")

    print("Initializing EmbeddingLoader...")
    embedding_loader = EmbeddingLoader()
    print("EmbeddingLoader initialized.")
    
    print("Initializing RecognitionService...")
    recognition_service = RecognitionService(embedding_loader)
    print("RecognitionService initialized.")
    
    print("Initializing VideoProcessor...")
    video_processor = VideoProcessor(recognition_service)
    print("VideoProcessor initialized.")

@app.get("/")
def read_root():
    return {"message": "Robocop Attendance Backend is running. Go to /docs for API documentation."}

@app.get("/health")
def read_health():
    return {"status": "ok"}

@app.post("/token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
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
            data={"sub": user.username, "role": user.role.value}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}

@app.post("/register", response_model=User)
@limiter.limit("5/minute")
async def register_user(request: Request, user_data: UserCreate):
    with Session(engine) as session:
        # Check if user exists
        existing = session.exec(select(User).where(User.username == user_data.username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Create user
        user = User(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            role=user_data.role, 
            full_name=user_data.full_name,
            face_identity=user_data.face_identity
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/attendance", response_model=List[AttendanceRecord])
def get_attendance_log(current_user: User = Depends(get_current_user)):
    # Any authenticated user can view log (for now), or restrict to teacher/admin/student(self)
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Attendance service not initialized")
    return attendance_service.get_recent_records()

@app.get("/attendance/my", response_model=List[AttendanceRecord])
def get_my_attendance(current_user: User = Depends(get_current_user)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    aliases = []
    if current_user.face_identity:
        aliases.append(current_user.face_identity)
        
    return attendance_service.get_student_history(current_user.username, aliases=aliases)

@app.post("/sessions")
def create_session(name: str, user: User = Depends(allow_teacher_admin)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.create_session(name)

@app.get("/sessions/active")
def get_active_session(current_user: User = Depends(get_current_user)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.get_active_session()

@app.post("/sessions/end")
def end_session(user: User = Depends(allow_teacher_admin)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.end_active_session()

@app.get("/sessions")
def get_session_history(user: User = Depends(get_current_user)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.get_session_history()

@app.get("/sessions/{session_id}/report")
def get_session_report(session_id: int, user: User = Depends(allow_teacher_admin)):
    if not attendance_service or not embedding_loader:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    all_students = list(embedding_loader.student_embeddings.keys())
    return attendance_service.get_session_report(session_id, all_students)

@app.post("/attendance/manual")
def manual_mark(student_name: str, session_id: int, user: User = Depends(allow_teacher_admin)):
    if not attendance_service:
         raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.mark_attendance(student_name, confidence=1.0, session_id=session_id)

@app.get("/attendance/absent")
def get_absent_students(current_user: User = Depends(get_current_user)):
    if not attendance_service or not embedding_loader:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    active = attendance_service.get_active_session()
    all_students = list(embedding_loader.student_embeddings.keys())
    
    if not active:
        # If no session, return all students as "absent" (or potentially empty list)
        return all_students
    
    return attendance_service.get_absentees_for_session(active.id, all_students)

@app.post("/recognize/video")
async def recognize_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    user: User = Depends(allow_teacher_kiosk)
):
    # ... existing code ... (This is actually recognize_video, wait I am replacing content, I need to insert BEFORE or nearby)
    pass

@app.post("/detect-faces")
async def detect_faces(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    # Lightweight endpoint for real-time camera overlay
    if not recognition_service:
        raise HTTPException(status_code=500, detail="Recognition service not initialized")
    
    # Read file
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"faces": []}
    
    # Convert to RGB
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Detect
    locations = recognition_service.detect_only(rgb_img)
    
    # Convert to JSON friendly format (top, right, bottom, left)
    return {"faces": locations}

@app.post("/recognize/image")
@limiter.limit("10/minute")
async def recognize_image(request: Request, file: UploadFile = File(...), user: User = Depends(allow_teacher_kiosk)):
    if not recognition_service:
        raise HTTPException(status_code=500, detail="Recognition service not initialized")
    
    # Check file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG are supported.")

    # Ensure evidence directory exists
    os.makedirs("static/evidence", exist_ok=True)
    evidence_filename = f"{uuid.uuid4()}.jpg"
    evidence_path = os.path.join("static/evidence", evidence_filename)

    try:
        # Read file into memory to use with OpenCV
        contents = await file.read()
        nparr = np.fromstring(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Save evidence to disk (write raw bytes or opencv image)
        # Using opencv write to ensure it's saved as valid image
        cv2.imwrite(evidence_path, img)
        
        # Convert to RGB for recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Pass the numpy array to recognition service
        results = recognition_service.recognize_image(rgb_img)
        
        # Mark attendance / Handle Unknowns
        if attendance_service:
            active_session = attendance_service.get_active_session()
            session_id = active_session.id if active_session else None
            
            # Create AttendanceSource record
            if session_id:
                with Session(engine) as db:
                    source = AttendanceSource(
                        session_id=session_id,
                        file_path=f"evidence/{evidence_filename}",
                        media_type="image"
                    )
                    db.add(source)
                    db.commit()
            
            for face in results:
                name = face['name']
                
                if name == "Unknown":
                    # Handle Unknown Face
                    if active_session:
                        # Crop face
                        top, right, bottom, left = face['bounding_box']
                        # Add padding? For now exact crop.
                        # Ensure coordinates are within bounds
                        h, w, _ = img.shape
                        top = max(0, top); left = max(0, left)
                        bottom = min(h, bottom); right = min(w, right)
                        
                        face_img = img[top:bottom, left:right]
                        
                        # Save to disk
                        filename = f"{uuid.uuid4()}.jpg"
                        # Organize by session? Or flat? key is session_id in DB.
                        # Let's simple flat folder "static/unknowns"
                        filepath = f"static/unknowns/{filename}"
                        cv2.imwrite(filepath, face_img)
                        
                        # Register in DB
                        # Note: path stored relative to static mount? or full?
                        # Let's store relative "unknowns/filename"
                        attendance_service.register_unknown(
                            session_id=active_session.id,
                            image_path=f"unknowns/{filename}",
                            confidence=face.get('distance', 0.0)
                        )
                else:
                    # Regular Attendance
                    attendance_service.mark_attendance(
                        name, 
                        confidence=face.get('distance', 0.0),
                        metadata=face
                    )

        return {"faces": results}
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()

def process_video_background(file_path: str, user_username: str, active_session_id: Optional[int]):
    try:
        print(f"Background: Processing task for video {file_path}")
        if not video_processor:
            print("Error: VideoProcessor not initialized in background task.")
            return

        # Move temporary video to evidence storage if session exists
        if active_session_id:
             os.makedirs("static/evidence", exist_ok=True)
             evidence_filename = f"{uuid.uuid4()}.mp4"
             evidence_dest = os.path.join("static/evidence", evidence_filename)
             # Copy/Move logic
             shutil.copy(file_path, evidence_dest)
             
             with Session(engine) as db:
                 source = AttendanceSource(
                    session_id=active_session_id,
                    file_path=f"evidence/{evidence_filename}",
                    media_type="video"
                 )
                 db.add(source)
                 db.commit()

        # Process the video
        # We process the original temp file or the new evidence file?
        # Let's process the temp file as it's already there and we might delete it later (though shutil.copy keeps it)
        results = video_processor.process_video(file_path)
        identities = results.get('identities', [])
        metadata = results.get('metadata', {})

        print(f"Background: Video processed. Identities found: {identities}")

        if attendance_service:
            for name in identities:
                if name == "Unknown":
                    # For unknown faces in video, we currently don't extract individual frames 
                    # to UnknownFace gallery as the processor aggregates metrics.
                    # Future improvement: Extract representative frames for Unknowns from video.
                    continue
                
                # Mark attendance
                # Use metadata if available
                confidence = 1.0
                meta = metadata.get(name, {})
                if 'distance' in meta:
                    confidence = meta['distance']
                
                attendance_service.mark_attendance(name, confidence=confidence, session_id=active_session_id, metadata=meta)

    except Exception as e:
        print(f"Error in background video processing: {e}")
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Background: Cleaned up temp file {file_path}")

@app.post("/recognize/video", status_code=202)
@limiter.limit("2/minute")
async def recognize_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    user: User = Depends(allow_teacher_kiosk)
):
    if not video_processor:
        raise HTTPException(status_code=500, detail="Video processor not initialized")
    
    # Check file type extension (basic check)
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov')):
         raise HTTPException(status_code=400, detail="Invalid file type. Only MP4, AVI, MOV are supported.")

    # Save uploaded file to a temporary file
    try:
        # Create a temp file that persists after close so background task can read it
        fd, tmp_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
        with os.fdopen(fd, 'wb') as tmp:
            shutil.copyfileobj(file.file, tmp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded video: {e}")

    # Capture current active session ID to attribute attendance correctly
    active_session_id = None
    if attendance_service:
        active = attendance_service.get_active_session()
        if active:
            active_session_id = active.id

    # Add to background tasks
    background_tasks.add_task(process_video_background, tmp_path, user.username, active_session_id)

    return {"status": "processing", "message": "Video accepted for background processing. Check Live Log for updates."}

@app.get("/sessions/active/unknowns", response_model=List[UnknownFace])
def get_active_unknowns(user: User = Depends(allow_teacher_admin)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    active = attendance_service.get_active_session()
    if not active:
        return []
        
    return attendance_service.get_unknowns(active.id)

@app.post("/unknowns/{unknown_id}/resolve")
def resolve_unknown(unknown_id: int, student_name: str, user: User = Depends(allow_teacher_admin)):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    record = attendance_service.resolve_unknown(unknown_id, student_name)
    if not record:
        raise HTTPException(status_code=404, detail="Unknown face not found")
    
    return record

# Dispute System

@app.post("/disputes", response_model=Dispute)
def create_dispute(dispute: DisputeCreate, current_user: User = Depends(get_current_user)):
    try:
        # Any role can file a dispute? Usually students.
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        return dispute_service.create_dispute(current_user.username, dispute.session_id, dispute.description)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}/evidence", response_model=List[AttendanceSource])
def get_session_evidence(session_id: int, current_user: User = Depends(get_current_user)):
    # Students can only see evidence for sessions they are part of? 
    # Or strict: Only session they are in? 
    # For now allow all logged in users to see evidence for correct dispute filing.
    with Session(engine) as session:
        return session.exec(select(AttendanceSource).where(AttendanceSource.session_id == session_id).order_by(AttendanceSource.timestamp.desc())).all()

@app.post("/disputes", response_model=Dispute)
def create_dispute(dispute: DisputeCreate, current_user: User = Depends(get_current_user)):
    try:
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        
        return dispute_service.create_dispute(
            student_username=current_user.username,
            session_id=dispute.session_id,
            description=dispute.description,
            attendance_source_id=dispute.attendance_source_id,
            selected_face_coords=dispute.selected_face_coords
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/disputes/my", response_model=List[Dispute])
def get_my_disputes(current_user: User = Depends(get_current_user)):
    try:
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        return dispute_service.get_my_disputes(current_user.username)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/disputes", response_model=List[Dispute])
def get_all_disputes(current_user: User = Depends(allow_teacher_admin)):
    try:
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        return dispute_service.get_all_disputes()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(dispute_id: int, status: DisputeStatus, current_user: User = Depends(allow_teacher_admin)):
    try:
        if not dispute_service:
            raise HTTPException(status_code=500, detail="Services not initialized")
        record = dispute_service.resolve_dispute(dispute_id, status)
        if not record:
            raise HTTPException(status_code=404, detail="Dispute not found")
        return record
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
