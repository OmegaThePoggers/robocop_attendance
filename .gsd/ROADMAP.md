# ROADMAP.md

> **Current Phase**: All phases complete ✅
> **Milestone**: Next.js & Optimization Rewrite

## Must-Haves (from SPEC)
- [ ] Refactored, simplified FastAPI backend without bugs
- [ ] New Next.js frontend replacing Vite
- [ ] Accurate, constant API connections
- [ ] Performance optimized across stack

## Phases

### Phase 1: Backend Refactoring & Optimization
**Status**: ✅ Complete
**Objective**: Simplify the FastAPI backend logic, remove ambiguity and bugs, and document endpoints clearly for optimal connections. Ensure current routes are reliable.

### Phase 2: Frontend Migration to Next.js (Setup & Core)
**Status**: ✅ Complete
**Objective**: Initialize a Next.js project (App Router recommended), set up Tailwindcss, and migrate core layout, authentication, and routing logic from `vite` to Next.js.

### Phase 3: Frontend Feature Completion & API Connections
**Status**: ✅ Complete
**Objective**: Migrate remaining components (Dashboard, Student Views, Dispute Management) and strictly wire up all forms and flows to the refactored and reliable backend API.

### Phase 4: Docker Reintegration & File Cleanup
**Status**: ✅ Complete
**Objective**: Update Docker configuration for the new Next.js frontend, remove the old Vite frontend service, create a new `frontend-next/Dockerfile`, update `docker-compose.yml`, and purge orphan files from the repository root.

### Phase 5: Accounts Revamp & CLI Management
**Status**: ✅ Complete
**Objective**: Create a CLI management tool for account operations (password reset, admin creation, role changes), auto-seed a default admin on first startup, and externalize SECRET_KEY. All features tested with Docker in mind.

### Phase 6: QA & Final Performance Optimization
**Status**: ✅ Complete
**Objective**: Conduct final end-to-end tests to verify robustness and apply Next.js and FastAPI optimization techniques (caching, faster loads, rate limit tuning).
