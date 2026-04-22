# RoboCop Attendance System 🤖

> AI-powered facial recognition attendance tracking with real-time processing, dispute resolution, and class management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, Python 3.9, SQLModel, PostgreSQL + pgvector |
| **AI/ML** | InsightFace (SCRFD detection + ArcFace embeddings), FAISS vector search |
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **Database** | PostgreSQL with pgvector extension for embedding storage |
| **Infrastructure** | Docker Compose |

## Features

- **Academic Dashboards** — Distinct portals for Admins, Teachers, and Students with analytics
- **Real-time Face Recognition** — Camera feed, image upload, and video upload support
- **AI Tutoring & Chat** — Multi-turn AI chat powered by Groq/Gemini for automated student assistance
- **Doubt Resolution** — Auto-classify subject doubts and allow teachers to resolve them later
- **Assignments & Marks** — End-to-end academic tracking, submissions, and grading
- **Dual-layer Matching** — FAISS in-memory index (< 2ms) with pgvector fallback
- **Session Management** — Named sessions with class scoping and attendance tracking
- **Absentee Detection** — Automatic absent list generation per session
- **Unknown Face Tracking** — Cropped face captures for unidentified individuals
- **Dispute Resolution** — Students can dispute missed attendance with side-by-side photo comparison
- **Class Management** — Create classes, assign students, manage rosters
- **Audit Logging** — Full action logging for admin operations

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start 🚀

### 1. Clone the repository

```bash
git clone https://github.com/OmegaThePoggers/robocop_attendance.git
cd robocop_attendance
```

### 2. Build and run

```bash
docker compose up --build -d
```

> **First launch** takes a few minutes — the backend downloads AI models (~300MB) and seeds the database.

### 3. Access the application

| Service | URL |
|---------|-----|
| **Frontend** | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) |
| **API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |

### 4. Default login

```
Username: admin
Password: robocop
```

> ⚠️ **Change the admin password** after first login in production.

## Project Structure

```
robocop_attendance/
├── backend/
│   ├── src/
│   │   ├── ai/                  # Face detection, embedding, matching
│   │   │   ├── detection/       # SCRFD face detector
│   │   │   ├── embedding/       # ArcFace embedding generator
│   │   │   ├── matching/        # FAISS + pgvector matcher
│   │   │   └── vector_index/    # FAISS index management
│   │   ├── routers/             # API endpoints
│   │   ├── models.py            # SQLModel database models
│   │   ├── attendance.py        # Attendance service logic
│   │   ├── dispute_service.py   # Dispute handling
│   │   └── main.py              # App entrypoint
│   └── Dockerfile
├── frontend-next/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   └── lib/                 # API client & utilities
│   └── Dockerfile
├── dataset/                     # Enrolled face images
├── docker-compose.yml
└── README.md
```

## Enrolling Students

### Via Registration Page
Students can self-register through the frontend with a selfie photo.

### Via Dataset Directory
1. Create a folder in `dataset/` named with the student's username:
   ```
   dataset/student_john_doe/
   ```
2. Add clear face photos (PNG/JPG) to the folder
3. Restart the backend — embeddings are generated automatically on startup

## Environment Variables

The following variables should be configured by creating a `.env` file in the root directory:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...@db:5432/robocop_db` | PostgreSQL connection string |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ADMIN_DEFAULT_PASSWORD` | `robocop` | Default admin password |
| `DATASET_PATH` | `/app/dataset` | Path to enrolled face images |
| `GROQ_API_KEY` | (empty) | **Required** for AI Chat / Doubt resolution |
| `GEMINI_API_KEY` | (empty) | **Optional** fallback for AI Chat / Doubt resolution |

> ⚠️ **For production**: You must create a `.env` file parallel to `docker-compose.yml` containing the production secrets and API keys to prevent them from being logged in version control.

## Development

### Hot Reloading
Both frontend and backend support hot reloading via Docker volume mounts:
- Backend: `./backend/src` → `/app/src`
- Frontend: `./frontend-next/src` → `/app/src`

### Restart Backend Only
```bash
docker compose restart backend
```

### View Logs
```bash
docker compose logs -f backend
```

### Reset Database
```bash
docker compose down -v
docker compose up --build -d
```
