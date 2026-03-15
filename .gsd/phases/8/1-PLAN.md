# Phase 8: Migrate to Advanced Face Recognition Backend

## Objective
Migrate the existing FastAPI backend to the "better backend template" architecture which utilizes SCRFD, ArcFace, PGVector, and FAISS for significantly improved face recognition accuracy and speed.

## Why?
The current implementation uses `face_recognition` (dlib/HOG based), which is a single-threaded CPU hog, slow on large images, and less accurate for difficult angles or low resolution compared to modern deep learning pipelines.
The new template provides:
- **SCRFD**: Fast, accurate face detection.
- **ArcFace**: State-of-the-art face embeddings.
- **pgvector**: Persistent, database-native vector storage for embeddings.
- **FAISS**: In-memory caching for <2ms search sweeps.

## Scope of Work
1. **Dependency Parity**: Ensure `requirements.txt` from the new template is integrated securely into the current `backend/requirements.txt` or Dockerfile. Include InsightFace, ONNXRuntime, FAISS, and asyncpg.
2. **Database Migration to pgvector**: Update the PostgreSQL database to use the `pgvector` extension. The existing database structure (users, students, sessions, disputes) will remain, but the student table or a new embeddings table will need to store ArcFace embeddings.
3. **Core AI Pipeline Migration**: Copy the `ai/` module from the template into `backend/src/ai/`. Initialize the singleton `FaceRecognitionPipeline`.
4. **Endpoint Rewiring**: 
   - Update `recognition.py` or the attendance endpoints to use the new `FaceRecognitionPipeline` instead of `RecognitionService`.
   - Ensure the Next.js frontend is completely unaffected by this underlying API change (keep existing request/response schemas intact where possible).
5. **Lifespan Management**: Integrate the FAISS pre-loading and model pre-warming from the template's `main.py` lifespan into the existing `main.py` lifespan.
6. **Container Updates**: Update `docker-compose.yml` to ensure the DB container loads `pgvector` (e.g., using `ankane/pgvector` image or installing it) and ensure the backend container has necessary system dependencies for ONNX/OpenCV/FAISS.

## Dependencies
- Requires Phase 1-7 to be completed (all current routes functioning).
- Requires Docker Compose to swap the base Postgres image to a pgvector-enabled one.

## Verification
- Can boot the environment with `docker-compose up --build`.
- Face detection and recognition endpoints return expected `confidence` and `bbox` values matching the Next.js frontend requirements.
- No regression in admin or student dashboard functionality.
