from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from .database import create_db_and_tables, engine
from .dependencies import (
    embedding_loader, 
    recognition_service, 
    video_processor,
    attendance_service,
    dispute_service,
    admin_service
)
from .embedding_loader import EmbeddingLoader
from .recognition import RecognitionService
from .video_processor import VideoProcessor

# Routers
from .routers import auth, sessions, attendance, admin, disputes, unknowns
from .routers import recognition # New router for recognition endpoints

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

# Include Routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(attendance.router)
app.include_router(admin.router)
app.include_router(disputes.router)
app.include_router(recognition.router)
app.include_router(unknowns.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.on_event("startup")
async def startup_event():
    # Initialize services via dependencies module globals? 
    # Or explicitly here. 
    # Since dependencies.py imports them, we can set them there if needed, 
    # but currently they are globals in dependencies.py initialized as None/Instance.
    # The 'service singletons' in dependencies.py need to be populated.
    
    # We need to update the globals in dependencies.py so the routers use the initialized instances.
    from . import dependencies
    
    dependencies.embedding_loader = EmbeddingLoader()
    dependencies.embedding_loader.load_embeddings()
    
    dependencies.recognition_service = RecognitionService(dependencies.embedding_loader)
    dependencies.video_processor = VideoProcessor(dependencies.recognition_service)
    
    # DB
    create_db_and_tables()

