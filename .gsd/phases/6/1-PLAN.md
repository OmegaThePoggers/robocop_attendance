---
phase: 6
plan: 1
---

# Plan 6.1: Backend Hardening & Cleanup

## Objective
Apply backend security, performance, and hygiene improvements to make the app production-ready.

## Context
- Rate limiter is initialized in `main.py` but NO routes have `@limiter.limit()` decorators
- CORS `allow_origins` still includes dead `localhost:5173` (old Vite port)
- No GZip compression middleware
- Orphan files at `backend/` root: `debug_sessions.py`, `inspect_db.py`, `seed.py`, `attendance.db`
- `register_user` and `register_teacher` endpoints have no auth protection (anyone can create accounts)

## Tasks

### Task 1: Apply Rate Limiting to Critical Endpoints
#### [MODIFY] `backend/src/routers/auth.py`
- Add `@limiter.limit("5/minute")` to `/token` (login)
- Add `@limiter.limit("3/minute")` to `/register` and `/register-teacher`
- Import `Request` and pass it as first param to decorated endpoints

### Task 2: Clean Up CORS Origins
#### [MODIFY] `backend/src/main.py`
- Remove `http://localhost:5173` from `allow_origins` (old Vite frontend is deleted)
- Make origins configurable via `CORS_ORIGINS` env var for production

### Task 3: Add GZip Compression
#### [MODIFY] `backend/src/main.py`
- Add `GZipMiddleware` from `starlette.middleware.gzip` with `minimum_size=500`

### Task 4: Delete Backend Orphan Files
#### [DELETE] `backend/debug_sessions.py`, `backend/inspect_db.py`, `backend/seed.py`, `backend/attendance.db`
- These are development artifacts that shouldn't be in version control
- `attendance.db` is the local SQLite file (project now uses Postgres via Docker)

## Success Criteria
- [ ] Login and register endpoints have rate limits
- [ ] CORS origins configurable and cleaned
- [ ] GZip middleware active
- [ ] Backend root has only `Dockerfile`, `pyproject.toml`, `uv.lock`, and `src/`
