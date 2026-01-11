from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
from .embedding_loader import EmbeddingLoader
from .recognition import RecognitionService
from .video_processor import VideoProcessor
from .database import create_db_and_tables
from .attendance import AttendanceService
from .models import AttendanceRecord
import shutil
import tempfile
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedding_loader: Optional[EmbeddingLoader] = None
recognition_service: Optional[RecognitionService] = None
video_processor: Optional[VideoProcessor] = None
attendance_service: Optional[AttendanceService] = None

@app.on_event("startup")
async def startup_event():
    global embedding_loader, recognition_service, video_processor, attendance_service
    print("Initializing Database...")
    create_db_and_tables()
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

    print("Initializing AttendanceService...")
    attendance_service = AttendanceService()
    print("AttendanceService initialized.")

@app.get("/")
def read_root():
    return {"message": "Robocop Attendance Backend is running. Go to /docs for API documentation."}

@app.get("/health")
def read_health():
    return {"status": "ok"}

@app.get("/attendance", response_model=List[AttendanceRecord])
def get_attendance_log():
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Attendance service not initialized")
    return attendance_service.get_recent_records()

@app.post("/sessions")
def create_session(name: str):
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.create_session(name)

@app.get("/sessions/active")
def get_active_session():
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.get_active_session()

@app.post("/sessions/end")
def end_session():
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.end_active_session()

@app.get("/sessions")
def get_session_history():
    if not attendance_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.get_session_history()

@app.get("/sessions/{session_id}/report")
def get_session_report(session_id: int):
    if not attendance_service or not embedding_loader:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    all_students = list(embedding_loader.student_embeddings.keys())
    return attendance_service.get_session_report(session_id, all_students)

@app.post("/attendance/manual")
def manual_mark(student_name: str, session_id: int):
    if not attendance_service:
         raise HTTPException(status_code=500, detail="Services not initialized")
    return attendance_service.mark_attendance(student_name, confidence=1.0, session_id=session_id)

@app.get("/attendance/absent")
def get_absent_students():
    if not attendance_service or not embedding_loader:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    active = attendance_service.get_active_session()
    all_students = list(embedding_loader.student_embeddings.keys())
    
    if not active:
        # If no session, return all students as "absent" (or potentially empty list)
        return all_students
    
    return attendance_service.get_absentees_for_session(active.id, all_students)

@app.post("/recognize/image")
async def recognize_image(file: UploadFile = File(...)):
    if not recognition_service:
        raise HTTPException(status_code=500, detail="Recognition service not initialized")
    
    # Check file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG are supported.")

    try:
        # Pass the file-like object directly to face_recognition
        results = recognition_service.recognize_image(file.file)
        
        # Mark attendance for recognized faces
        if attendance_service:
            for face in results:
                if face['name'] != "Unknown":
                    # Use distance as confidence metric (lower is better, so maybe 1 - distance?)
                    # For now, just logging the raw distance as confidence isn't quite right as confidence usually is 0-1 where 1 is best.
                    # Let's just pass the raw distance for now or 0.0
                    attendance_service.mark_attendance(face['name'], confidence=face['distance'])

        return {"faces": results}
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()

@app.post("/recognize/video")
async def recognize_video(file: UploadFile = File(...)):
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
            for name in results["identities"]:
                attendance_service.mark_attendance(name)
            
        return results
    except Exception as e:
        print(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        await file.close()
