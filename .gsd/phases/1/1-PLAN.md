---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Backend Refactoring & Optimization

## Objective
The objective is to simplify and optimize the FastAPI backend. Current logic is ambiguous and prone to state bugs due to global dependency overrides on startup. Endpoint structures need to be formalized with clear Pydantic schemas, and blocking operations in recognition need optimization.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- backend/src/main.py
- backend/src/dependencies.py
- backend/src/routers/

## Tasks

<task type="auto">
  <name>Refactor App Lifespan and Dependencies</name>
  <files>backend/src/main.py, backend/src/dependencies.py</files>
  <action>
    - Refactor `main.py` to use FastAPI's `@asynccontextmanager` `lifespan` instead of the deprecated `@app.on_event("startup")`.
    - Clean up `dependencies.py` to remove ambiguously mutable global instances (`dependencies.embedding_loader = ...`), instead resolving them cleanly in the lifespan or overriding app state (`app.state.embedding_loader`).
    - Update routers to fetch these core services from request app state or clean dependency injection.
    - WHAT TO AVOID AND WHY: Avoid circular imports and fragile global variable changes, which cause the current convolution and bugs.
  </action>
  <verify>uv run uvicorn backend.src.main:app --reload --dry-run or equivalent local syntax check</verify>
  <done>App starts up without deprecation warnings and core services are attached to app state cleanly.</done>
</task>

<task type="auto">
  <name>Standardize API Responses</name>
  <files>backend/src/routers/*.py, backend/src/schemas.py</files>
  <action>
    - Audit all endpoints in `auth.py`, `sessions.py`, `attendance.py`, `recognition.py` etc.
    - Ensure every endpoint returns exactly a defined Pydantic schema from `schemas.py` or standard FastAPI responses, instead of returning arbitrary `{"message": "xyz"}` dictionaries.
    - Check and optimize any overly convoluted DB queries (e.g. nested loops inside endpoints) to utilize SQLModel relationships effectively.
  </action>
  <verify>pytest backend/tests/ or manual curl verification of endpoints</verify>
  <done>All backend endpoints have concrete `response_model` annotations and return appropriate data structures.</done>
</task>

## Success Criteria
- [ ] FastAPI startup warning is gone.
- [ ] Dependency injection is robust.
- [ ] JSON responses are standardized and predictable for the frontend to consume.
