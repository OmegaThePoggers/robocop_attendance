from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from auth.router import router as auth_router
from students.router import router as students_router
from teachers.router import router as teachers_router
from classes.router import router as classes_router
from attendance_sessions.router import router as sessions_router
from attendance_disputes.router import router as disputes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────
    # 1. Pre-warm AI models (SCRFD detection + ArcFace recognition)
    from ai.pipeline import pipeline  # noqa: F401 — triggers singleton init

    # 2. Preload FAISS indices for all classes that already have enrolled faces.
    #    This avoids a slow first-request build (target: < 2 ms search latency).
    try:
        from ai.vector_index.embedding_cache import load_all_active_classes
        from core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await load_all_active_classes(db)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "FAISS startup preload failed (non-fatal): %s", exc
        )

    yield
    # ── Shutdown ─────────────────────────────────────────────────────────
    # Clear FAISS cache so old indices don't linger across hot-reloads
    try:
        from ai.vector_index.embedding_cache import invalidate_all
        invalidate_all()
    except Exception:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-powered attendance system. Teachers upload classroom photos; "
        "faces are detected using SCRFD and matched against ArcFace embeddings "
        "stored in pgvector. FAISS in-memory indices provide < 2 ms search "
        "latency with pgvector as the persistent fallback."
    ),
    contact={"name": "IETE App Team"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# CORS
origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(teachers_router)
app.include_router(classes_router)
app.include_router(sessions_router)
app.include_router(disputes_router)


@app.get("/health", tags=["System"])
async def health():
    """Health check: verifies database connectivity and reports FAISS cache size."""
    from sqlalchemy import text
    from core.database import AsyncSessionLocal
    from ai.vector_index.embedding_cache import _cache as faiss_cache

    db_status = "connected"
    http_status = 200

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
        http_status = 503

    return JSONResponse(
        status_code=http_status,
        content={
            "status": "ok" if db_status == "connected" else "degraded",
            "database": db_status,
            "faiss_indices_loaded": len(faiss_cache),
        },
    )
