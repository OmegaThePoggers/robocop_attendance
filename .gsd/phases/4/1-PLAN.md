---
phase: 4
plan: 1
---

# Plan 4.1: Docker Reintegration for Next.js Frontend

## Objective
Update the Docker setup to replace the old Vite frontend service with the new Next.js app. Create a new `frontend-next/Dockerfile`, update `docker-compose.yml`, and ensure the full 3-service stack (db + backend + frontend) works.

## Context
- `docker-compose.yml` — currently references `./frontend` (old Vite app) on port 5173
- `backend/Dockerfile` — unchanged, already correct for the refactored backend
- `frontend/Dockerfile` — old Vite Dockerfile (will be superseded)
- The Next.js app runs on port 3000 by default

## Tasks

<task type="auto">
  <name>Create Next.js Dockerfile</name>
  <files>frontend-next/Dockerfile (NEW)</files>
  <action>
    - Create `frontend-next/Dockerfile` based on `node:22-alpine`
    - Use multi-stage build if desired, but for dev the simple approach is fine:
      1. Install dependencies (`npm ci`)
      2. Copy source
      3. Expose port 3000
      4. CMD `npm run dev`
    - Add `frontend-next/.dockerignore` to exclude `node_modules/`, `.next/`, `.env.local`
  </action>
  <verify>docker build -t robocop-frontend-next ./frontend-next</verify>
  <done>Dockerfile builds successfully.</done>
</task>

<task type="auto">
  <name>Update docker-compose.yml</name>
  <files>docker-compose.yml (MODIFY)</files>
  <action>
    - Replace the `frontend` service with a `frontend` service pointing to `./frontend-next`
    - Change port from `5173:5173` to `3000:3000`
    - Update volume mounts for Next.js source structure (`src/`, `public/`)
    - Update environment variable from `VITE_API_URL` to `NEXT_PUBLIC_API_URL=http://localhost:8000`
    - Keep the backend and db services unchanged
  </action>
  <verify>docker-compose config (validates compose file syntax)</verify>
  <done>docker-compose.yml points to the new Next.js frontend.</done>
</task>

## Success Criteria
- [ ] `frontend-next/Dockerfile` exists and builds
- [ ] `docker-compose.yml` references `./frontend-next` for the frontend service
- [ ] `docker-compose up` starts all 3 services successfully
