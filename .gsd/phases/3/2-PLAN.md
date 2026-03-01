---
phase: 3
plan: 2
---

# Plan 3.2: End-to-End Flow Validation & Cleanup

## Objective
Verify that all major user flows work end-to-end between the Next.js frontend and the refactored FastAPI backend. Clean up any dead code and ensure the old `frontend/` directory is properly deprecated.

## Tasks

<task type="auto">
  <name>Backend Static File Serving Audit</name>
  <files>backend/src/main.py (MODIFY if needed)</files>
  <action>
    - Verify that `main.py` mounts the static file directory correctly (the frontend references `/static/{path}` for evidence images, unknown faces, etc.)
    - Ensure CORS `allow_origins` includes the Next.js dev server URL (`http://localhost:3000`)
    - Verify the backend serves uploaded images correctly at `/static/` path
  </action>
  <verify>Check that main.py CORS config includes localhost:3000</verify>
  <done>Backend static serving and CORS are correct for the Next.js frontend.</done>
</task>

<task type="auto">
  <name>Remove Dead Frontend Code</name>
  <files>
    frontend/src/App.css (DELETE candidate),
    backend/src/main_backup.py (DELETE candidate)
  </files>
  <action>
    - Delete `frontend/src/App.css` (Vite boilerplate, unused)
    - Delete `backend/src/main_backup.py` (dead code from Phase 1)
    - Add `frontend/` directory note in README that it's the legacy frontend (or delete entirely if user confirms)
  </action>
  <verify>Build still passes after cleanup</verify>
  <done>Dead code removed.</done>
</task>

<task type="manual">
  <name>User Validates Full-Stack Flow</name>
  <action>
    User runs both servers and tests the following flows:
    1. Start backend: `cd backend && uvicorn src.main:app --reload`
    2. Start frontend: `cd frontend-next && npm run dev`
    3. Test login flow at http://localhost:3000/login
    4. Test teacher dashboard (create session, upload image, view attendance)
    5. Test student dashboard (view attendance, file dispute)
    6. Test admin dashboard (resolve disputes, manage classes)
  </action>
  <done>User confirms all flows work correctly.</done>
</task>

## Success Criteria
- [ ] Backend CORS allows `localhost:3000`
- [ ] Static files (evidence images, unknown faces) load in the Next.js app
- [ ] Dead code removed
- [ ] User confirms major flows work end-to-end
