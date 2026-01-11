# Robocop Attendance System 🤖

> "Dead or alive, you're coming with me." - *Robocop (and this attendance system)*

A robust, session-based Face Recognition Attendance System built with **FastAPI** (Backend) and **React/Vite** (Frontend).

## Features

- **🎯 Real-time Face Recognition**: Upload images or videos to instantly identify students.
- **⏱️ Session Management**: Create named sessions (e.g., "Math 101"), track "Active" time, and end sessions.
- **📊 Live Attendance Log**: See who enters in real-time.
- **👻 Absentee Tracking**: Automatically calculates who is missing based on the "Active Session".
- **📝 Manual Overrides**: Manually mark students present if facial recognition fails (or they forgot their face).
- **📜 Session History**: View logs of all past sessions, including detailed "Present vs Absent" reports.
- **📈 Scalable**: Designed to handle cohorts of 30+ students efficiently.

## Project Structure

- **backend/**: FastAPI application, SQLite database, and Face Recognition logic.
- **frontend/**: React application with Tailwind CSS.
- **dataset/**: Directory containing face images for known students.

## Quick Start

### 1. Backend Setup

Prerequisites: Python 3.9+, `uv` (recommended) or `pip`.

```bash
cd backend

# Install dependencies (using uv)
uv sync

# OR using pip
# pip install -r requirements.txt (if generated)

# Start the server
source .venv/bin/activate
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```
The API will be available at [http://localhost:8000](http://localhost:8000).

### 2. Frontend Setup

Prerequisites: Node.js (v18+ recommended).

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The App will be available at [http://localhost:5173](http://localhost:5173).

## Usage Guide

1.  **Add Students**:
    - Create a folder in `dataset/` named purely with the student's ID/Name (e.g., `dataset/student_007_james_bond`).
    - Add clear photos of their face (JPG/PNG) to that folder.
    - Restart the backend to retrain the model (takes seconds).

2.  **Start a Session**:
    - On the frontend dashboard, enter a **Session Name** and click **START SESSION**.
    
3.  **Take Attendance**:
    - **Upload Image/Video**: Use the panel on the left to upload media from a classroom camera.
    - **Live Log**: Watch faces get recognized and added to the table.
    - **Absentees**: Switch to the "Absentees" tab to see who is missing. Click **Mark Present** to manually add them.

4.  **End Session**:
    - Click **END SESSION** in the header.
    - View past records in the **History** tab. Click a row to see the full Present/Absent report.

## Hardware & Scalability
See [SCALABILITY_AND_HARDWARE.md](./SCALABILITY_AND_HARDWARE.md) for details on camera requirements and performance limits.

## Testing
We've included a script to generate mock data for stress testing:
```bash
cd backend
python generate_mock_students.py --count 30
```
