from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

from .database import create_db_and_tables, engine
from .embedding_loader import seed_dataset, EmbeddingLoader
from .ai.vector_index.embedding_cache import load_all_active_classes
from .recognition import RecognitionService
from .video_processor import VideoProcessor
from .attendance import AttendanceService
from .dispute_service import DisputeService
from .admin_service import AdminService

# Routers
from .routers import (
    auth, sessions, attendance, admin, disputes, unknowns, recognition,
    doubts, assignments, marks, notifications, library, schedule, chat
)
from .dependencies import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initializes DB and ML services on startup."""
    # --- Startup ---
    create_db_and_tables()

    # Auto-seed default admin if none exists
    _seed_default_admin()

    # Seed datasets and load FAISS indices
    from sqlmodel import Session
    with Session(engine) as session:
        seed_dataset(session)
        load_all_active_classes(session)

    # Initialize ML services and attach to app.state
    app.state.recognition_service = RecognitionService()
    app.state.video_processor = VideoProcessor(app.state.recognition_service)

    # Initialize DB-backed services
    app.state.attendance_service = AttendanceService()
    app.state.dispute_service = DisputeService()
    app.state.admin_service = AdminService()
    app.state.embedding_loader = EmbeddingLoader()

    yield

    # --- Shutdown (cleanup if needed) ---


def _seed_default_admin():
    """Create a default admin user if no admin exists in the database."""
    from sqlmodel import Session, select
    from .database import engine
    from .models import User, UserRole
    from .auth_service import get_password_hash

    with Session(engine) as session:
        existing_admin = session.exec(
            select(User).where(User.role == UserRole.ADMIN)
        ).first()

        if existing_admin:
            return  # An admin already exists, skip seeding

        default_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "robocop")
        admin_user = User(
            username="admin",
            password_hash=get_password_hash(default_password),
            role=UserRole.ADMIN,
            full_name="System Administrator",
        )
        session.add(admin_user)
        session.commit()
        print(f"[STARTUP] Default admin created → username: admin / password: {default_password}")


app = FastAPI(title="SmartAttend + Cogni", version="3.0", lifespan=lifespan)

# Rate Limiter Setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=500)

# Enable CORS — configurable via CORS_ORIGINS env var
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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

# Cogni Routers
app.include_router(doubts.router)
app.include_router(assignments.router)
app.include_router(marks.router)
app.include_router(notifications.router)
app.include_router(library.router)
app.include_router(schedule.router)
app.include_router(chat.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "platform": "SmartAttend + Cogni v3.0"}
