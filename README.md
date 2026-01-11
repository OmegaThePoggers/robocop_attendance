# Face Recognition Attendance System

A full-stack face recognition attendance application built with **FastAPI** (Python) and **React** (coming soon).

## Project Structure
- `backend/` - FastAPI application for face recognition and attendance logic.
- `frontend/` - React frontend (TBD).
- `dataset/` - Directory for student images.

## Prerequisites
- **Python 3.9+**
- **Node.js** (for frontend)
- **uv** (for fast Python package management) - [Install uv](https://github.com/astral-sh/uv)

## Quick Start

### 1. Backend Setup

This project uses `uv` for ultra-fast dependency management.

```bash
# Navigate to backend
cd backend

# Sync dependencies (creates .venv and installs locked packages)
uv sync
```

### 2. Run the Server

```bash
# Activate virtual environment
source .venv/bin/activate

# Start the server
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## Workflows
- **Add a student:** Create a folder in `dataset/` (e.g., `dataset/student_1_john_doe/`) and add their photo(s).
- **Verify embeddings:** Restart the backend; it loads embeddings on startup.

## Status
See [progress.md](progress.md) for detailed development tracking.
