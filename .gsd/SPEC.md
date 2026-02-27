# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
The goal is to simplify and optimize the existing Python/FastAPI backend, eliminating ambiguity and bugs while establishing robust, constant connections to the frontend. Furthermore, the frontend is to be migrated from React/Vite to Next.js to provide a more performant and structured framework, optimizing the overall application performance as much as possible.

## Goals
1. Simplify, clean up, and resolve bugs within the FastAPI backend structure.
2. Ensure accurate, reliable, and constant API connections between the frontend and backend.
3. Migrate the Vite-based React frontend to a modern Next.js architecture.
4. Optimize end-to-end performance.

## Non-Goals (Out of Scope)
- Migrating the database from SQLite (unless absolutely necessary for Next.js/deployment).
- Major feature additions; focusing purely on optimization, refactoring, and framework migration.

## Users
- Administrators managing attendance, classes, and disputes.
- Students viewing their attendance logic.

## Constraints
- Must maintain the underlying face recognition logic and integration.
- Must preserve existing data paradigms (models).

## Success Criteria
- [ ] Backend endpoints are clearly documented and bug-free.
- [ ] Frontend successfully runs on Next.js with App or Pages router.
- [ ] No broken features compared to the old Vite version.
- [ ] Faster page load and reliable API connections.
