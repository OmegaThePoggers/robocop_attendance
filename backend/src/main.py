from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional, List, Dict
from sqlmodel import Session, select
from datetime import timedelta

from .embedding_loader import EmbeddingLoader
from .recognition import RecognitionService
from .video_processor import VideoProcessor
from .database import create_db_and_tables, engine
from .attendance import AttendanceService
from .dispute_service import DisputeService
from .models import AttendanceRecord, User, UserRole, Dispute, DisputeStatus, DisputeCreate
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
            data={"sub": user.username, "role": user.role.value}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}

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
    return attendance_service.get_student_history(current_user.username)

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

@app.post("/recognize/image")
async def recognize_image(file: UploadFile = File(...), user: User = Depends(allow_teacher_kiosk)):
    if not recognition_service:
        raise HTTPException(status_code=500, detail="Recognition service not initialized")
    
    # Check file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG are supported.")

    try:
        # Read file into memory to use with OpenCV
        contents = await file.read()
        nparr = np.fromstring(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to RGB for recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Pass the numpy array to recognition service
        results = recognition_service.recognize_image(rgb_img)
        
        # Mark attendance / Handle Unknowns
        if attendance_service:
            active_session = attendance_service.get_active_session()
            
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

@app.post("/recognize/video")
async def recognize_video(file: UploadFile = File(...), user: User = Depends(allow_teacher_kiosk)):
    if not video_processor:
        raise HTTPException(status_code=500, detail="Video processor not initialized")
    
    # Check file type extension (basic check)
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov')):
         raise HTTPException(status_code=400, detail="Invalid file type. Only MP4, AVI, MOV are supported.")

    # Save uploaded file to a temporary file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded video: {e}")

    try:
        # Process video
        results = video_processor.process_video(tmp_path)
        
        # Mark attendance for video consensus
        if attendance_service and results.get("identities"):
            metadata_map = results.get("metadata", {})
            for name in results["identities"]:
                student_metadata = metadata_map.get(name)
                conf = student_metadata.get('distance', 0.0) if student_metadata else 0.0
                attendance_service.mark_attendance(name, confidence=conf, metadata=student_metadata)
            
        return results
    except Exception as e:
        print(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        await file.close()

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
