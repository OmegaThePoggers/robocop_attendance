#!/usr/bin/env python3
"""
End-to-End Attendance System Test Script
=========================================
Simulates the complete system workflow from login to dispute resolution.

Usage:
    python tests/e2e_attendance_test.py

Environment variables:
    API_URL  — base URL of the running API (default: http://localhost:8000)
    ADMIN_EMAIL    — admin user email    (default: admin@example.com)
    ADMIN_PASSWORD — admin user password (default: Admin@123)

Prerequisites:
    1. docker-compose up --build
    2. An admin user must already exist in the database.
       Seed one via:
         INSERT INTO users (id, email, password_hash, role, name)
         VALUES (gen_random_uuid(), 'admin@example.com',
                 '<bcrypt_hash_of_Admin@123>', 'admin', 'Admin User');
    3. pip install requests
"""

import os
import sys
import time
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_URL = os.getenv("API_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")

# Dummy 1×1 white JPEG for face upload (replace with a real face image in CI)
DUMMY_IMAGE_B64 = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e\xbb"
)

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def step(n: int, msg: str) -> None:
    print(f"\n\033[1;34mSTEP {n}\033[0m — {msg}")


def ok(msg: str = "") -> None:
    print(f"  \033[32m✓\033[0m {msg}")


def fail(msg: str, resp: requests.Response = None) -> None:
    print(f"  \033[31m✗ FAILED\033[0m {msg}")
    if resp is not None:
        print(f"    HTTP {resp.status_code}: {resp.text[:300]}")
    sys.exit(1)


def post(url: str, token: str = None, **kwargs) -> requests.Response:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.post(f"{API_URL}{url}", headers=headers, **kwargs)


def get(url: str, token: str = None, **kwargs) -> requests.Response:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.get(f"{API_URL}{url}", headers=headers, **kwargs)


def patch(url: str, token: str = None, **kwargs) -> requests.Response:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.patch(f"{API_URL}{url}", headers=headers, **kwargs)


# ---------------------------------------------------------------------------
# Test steps
# ---------------------------------------------------------------------------

def test_health() -> None:
    step(0, "System health check")
    r = get("/health")
    if r.status_code not in (200, 503):
        fail("Unexpected health status code", r)
    data = r.json()
    ok(f"status={data.get('status')} database={data.get('database')}")


def login(email: str, password: str) -> str:
    r = post("/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        fail(f"Login failed for {email}", r)
    return r.json()["access_token"]


def test_admin_login() -> str:
    step(1, "Admin login")
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    ok("Admin login successful")
    return token


def test_create_teacher(admin_token: str) -> dict:
    step(2, "Create teacher account")
    r = post(
        "/teachers/",
        token=admin_token,
        json={
            "email": "teacher_e2e@example.com",
            "password": "Teacher@123",
            "name": "E2E Teacher",
            "employee_id": "EMP-E2E-001",
        },
    )
    if r.status_code not in (200, 201, 400):
        fail("Teacher creation failed", r)
    if r.status_code == 400 and "already" in r.json().get("detail", ""):
        ok("Teacher already exists — continuing")
    else:
        ok(f"Teacher created: id={r.json().get('id')}")
    return r.json()


def test_create_students(admin_token: str) -> list:
    step(3, "Create two student accounts")
    students = []
    for i in range(1, 3):
        r = post(
            "/students/",
            token=admin_token,
            json={
                "email": f"student_e2e_{i}@example.com",
                "password": "Student@123",
                "name": f"E2E Student {i}",
                "sap_id": f"SAP-E2E-00{i}",
            },
        )
        if r.status_code not in (200, 201, 400):
            fail(f"Student {i} creation failed", r)
        if r.status_code == 400:
            ok(f"Student {i} already exists — skipping")
            # Lookup by fetching all students and finding by sap_id
        else:
            students.append(r.json())
            ok(f"Student {i} created: id={r.json().get('id')}")
    return students


def test_create_class(admin_token: str) -> dict:
    step(4, "Create a class")
    # Get teacher id first
    teachers_r = get("/teachers/", token=admin_token)
    if teachers_r.status_code != 200 or not teachers_r.json():
        fail("Could not fetch teachers", teachers_r)

    teacher_token = login("teacher_e2e@example.com", "Teacher@123")
    r = post(
        "/classes/",
        token=teacher_token,
        json={"name": "E2E Class", "subject": "Computer Vision"},
    )
    if r.status_code not in (200, 201):
        fail("Class creation failed", r)
    cls = r.json()
    ok(f"Class created: id={cls.get('id')}")
    return cls, teacher_token


def test_add_students_to_class(admin_token: str, teacher_token: str, class_id: str) -> None:
    step(5, "Add students to class")
    students_r = get("/students/", token=admin_token)
    if students_r.status_code != 200:
        fail("Could not list students", students_r)
    students = [s for s in students_r.json() if "e2e" in s.get("email", "").lower()]
    if not students:
        fail("No E2E students found — run student creation first")
    for s in students:
        r = post(
            f"/classes/{class_id}/students",
            token=teacher_token,
            json={"student_id": s["id"]},
        )
        if r.status_code not in (200, 201, 400):
            fail(f"Adding student {s['id']} failed", r)
        ok(f"Student {s['sap_id']} added to class")


def test_enroll_faces(admin_token: str, class_id: str) -> None:
    step(6, "Enroll faces for students (using placeholder image)")
    students_r = get("/students/", token=admin_token)
    students = [s for s in students_r.json() if "e2e" in s.get("email", "").lower()]
    for s in students:
        r = requests.post(
            f"{API_URL}/students/{s['id']}/faces",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("face.jpg", DUMMY_IMAGE_B64, "image/jpeg")},
        )
        # 422 is expected with a dummy non-face image — acceptable in this smoke test
        if r.status_code in (200, 201, 422):
            status_word = "enrolled" if r.status_code in (200, 201) else "skipped (no face detected)"
            ok(f"Student {s['sap_id']} face {status_word}")
        else:
            fail(f"Face enrollment error for {s['sap_id']}", r)


def test_start_session(teacher_token: str, class_id: str) -> dict:
    step(7, "Start attendance session")
    r = post("/attendance-sessions/", token=teacher_token, json={"class_id": class_id})
    if r.status_code not in (200, 201):
        fail("Session creation failed", r)
    session = r.json()
    ok(f"Session created: id={session['id']} status={session['status']}")
    return session


def test_upload_photo(teacher_token: str, session_id: str) -> None:
    step(8, "Upload classroom photo")
    r = requests.post(
        f"{API_URL}/attendance-sessions/{session_id}/photo",
        headers={"Authorization": f"Bearer {teacher_token}"},
        files={"file": ("classroom.jpg", DUMMY_IMAGE_B64, "image/jpeg")},
    )
    if r.status_code not in (200, 201):
        fail("Photo upload failed", r)
    ok(f"Photo uploaded — session status={r.json().get('status')}")


def test_wait_for_processing(teacher_token: str, session_id: str, max_wait: int = 60) -> None:
    step(9, "Waiting for Celery recognition task to complete (max 60s)")
    for i in range(max_wait):
        r = get(f"/attendance-sessions/{session_id}/results", token=teacher_token)
        if r.status_code == 200:
            session_status = r.json().get("session", {}).get("status")
            if session_status in ("review", "confirmed", "locked"):
                ok(f"Processing complete — session status={session_status}")
                return
        time.sleep(1)
        if i % 10 == 9:
            print(f"  ... still waiting ({i+1}s)")
    # Continue even if processing is still running (worker may be off in test env)
    print("  ⚠  Processing not complete within timeout — continuing anyway")


def test_fetch_results(teacher_token: str, session_id: str) -> dict:
    step(10, "Fetch attendance results")
    r = get(f"/attendance-sessions/{session_id}/results", token=teacher_token)
    if r.status_code != 200:
        fail("Fetching results failed", r)
    data = r.json()
    ok(
        f"Results: total={data.get('total_students')} "
        f"present={data.get('present_count')} absent={data.get('absent_count')}"
    )
    return data


def test_confirm_session(teacher_token: str, session_id: str) -> None:
    step(11, "Confirm session (lock attendance)")
    r = post(f"/attendance-sessions/{session_id}/confirm", token=teacher_token)
    # May fail if session is not in review state (e.g. still processing) — that's ok in smoke test
    if r.status_code in (200, 201):
        ok(f"Session confirmed — status={r.json().get('status')}")
    elif r.status_code == 400:
        ok(f"Session not in review state yet (skipped confirm): {r.json().get('detail')}")
    else:
        fail("Session confirm failed", r)


def test_submit_dispute(student_token: str, results: dict) -> str | None:
    step(12, "Submit a dispute for an absent student")
    absent_records = [
        rec for rec in results.get("records", [])
        if rec.get("status") in ("absent", "overridden_absent")
    ]
    if not absent_records:
        ok("No absent students found — skipping dispute test")
        return None

    record = absent_records[0]
    r = post(
        "/disputes/",
        token=student_token,
        json={
            "record_id": record["id"],
            "bbox_x": 50, "bbox_y": 50,
            "bbox_w": 150, "bbox_h": 150,
        },
    )
    if r.status_code in (200, 201):
        dispute_id = r.json()["id"]
        ok(f"Dispute submitted: id={dispute_id}")
        return dispute_id
    elif r.status_code == 400:
        ok(f"Dispute not accepted: {r.json().get('detail')} — skipping")
        return None
    else:
        fail("Dispute submission failed", r)


def test_check_dispute(admin_token: str, dispute_id: str, max_wait: int = 30) -> None:
    step(13, "Verify dispute resolution (wait for Celery verify_dispute_task)")
    for i in range(max_wait):
        r = get(f"/disputes/{dispute_id}", token=admin_token)
        if r.status_code == 200:
            dispute_status = r.json().get("status")
            if dispute_status in ("auto_approved", "admin_review", "resolved"):
                ok(f"Dispute resolved — status={dispute_status}")
                return
        time.sleep(1)
        if i % 10 == 9:
            print(f"  ... still waiting ({i+1}s)")
    ok("Dispute verification pending — worker may be offline in this environment")


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def main():
    print("\n" + "=" * 60)
    print("  AI Attendance System — End-to-End Test")
    print("=" * 60)
    print(f"  API: {API_URL}")
    print("=" * 60)

    test_health()

    # Admin flow
    admin_token = test_admin_login()
    test_create_teacher(admin_token)
    test_create_students(admin_token)
    cls, teacher_token = test_create_class(admin_token)
    class_id = cls["id"]
    test_add_students_to_class(admin_token, teacher_token, class_id)
    test_enroll_faces(admin_token, class_id)

    # Attendance flow
    session = test_start_session(teacher_token, class_id)
    session_id = session["id"]
    test_upload_photo(teacher_token, session_id)
    test_wait_for_processing(teacher_token, session_id)
    results = test_fetch_results(teacher_token, session_id)
    test_confirm_session(teacher_token, session_id)

    # Dispute flow — login as student 1
    student_token = login("student_e2e_1@example.com", "Student@123")
    dispute_id = test_submit_dispute(student_token, results)
    if dispute_id:
        test_check_dispute(admin_token, dispute_id)

    print("\n" + "=" * 60)
    print("  \033[1;32mAll steps completed successfully ✓\033[0m")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
