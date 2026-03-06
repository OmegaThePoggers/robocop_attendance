---
phase: 7
plan: 1
---

# Plan 7.1: Fix Dispute Evidence Photos & Scope Attendance by Class

## Bug 1: Session photos not showing in dispute filing

### Root Cause
The `GET /sessions/{session_id}/evidence` endpoint (in `routers/sessions.py:81`) requires `allow_teacher_admin` auth — students get a **403 Forbidden**. The `SessionEvidenceGallery` component silently fails and shows "No media available."

### Fix
Create a **student-accessible evidence endpoint** — either relax the existing one or add a new read-only route that only allows viewing evidence for sessions the student participated in.

#### [MODIFY] `backend/src/routers/sessions.py`
- Add new endpoint: `GET /sessions/{session_id}/evidence/student`
- Uses `get_current_user` (any authenticated user) instead of `allow_teacher_admin`
- Only returns evidence if the student was enrolled in the session's class

#### [MODIFY] `frontend-next/src/lib/api.js`
- Update `getSessionEvidence()` to call the student endpoint when the user role is `student`, or add a separate `getStudentSessionEvidence()` function
- **Simpler approach**: make the backend endpoint accessible to both roles and keep the same URL

**Chosen approach**: Relax the existing `get_session_evidence` to use `get_current_user` instead of `allow_teacher_admin`. Students should be able to view evidence for sessions they need to dispute.

---

## Bug 2: Attendance logs showing records from all classes

### Root Cause
- `get_student_history()` in `attendance.py` fetches ALL records matching the student's name, with no `session_id` or `class_id` filter.
- `get_session_history()` returns ALL inactive sessions regardless of which class the student belongs to.
- The student dashboard shows ALL sessions, not just those for their assigned class.

### Fix

#### [MODIFY] `backend/src/attendance.py`
- Update `get_student_history()` to accept an optional `class_id` parameter
- When `class_id` is provided, join through `AttendanceSession` to filter records only from sessions belonging to that class

#### [MODIFY] `backend/src/routers/attendance.py`
- Update `get_my_attendance` to pass the student's `class_id` to `get_student_history()`

#### [MODIFY] `backend/src/routers/sessions.py`
- Update `get_sessions` to filter by the student's `class_id` when the user is a student
- Teachers/admins continue to see all sessions

---

## Verification Plan

### Manual Testing (Docker)
1. `docker-compose up --build -d`
2. Seed DB: `docker exec robocop_backend python -m src.cli seed-db`
3. Log in as teacher → create a session for CS-101 → upload a photo → end session
4. Log in as a student assigned to CS-101 → verify:
   - Session history only shows CS-101 sessions
   - Attendance records only show CS-101 records
   - Filing a dispute → clicking "View Evidence" shows the uploaded photo
5. Confirm a student NOT in CS-101 does NOT see those sessions

## Success Criteria
- [ ] Students can see session evidence photos when filing disputes
- [ ] Student attendance history is scoped to their assigned class
- [ ] Student session history is scoped to their assigned class
- [ ] Teachers/admins still see all sessions and all attendance records
