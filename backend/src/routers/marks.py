from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from ..dependencies import get_session, get_current_user
from ..models import User, UserRole, SubjectMark

router = APIRouter(prefix="/marks", tags=["marks"])

GRADE_TABLE = [
    (90, "A+", 10.0),
    (80, "A",  9.0),
    (70, "B+", 8.0),
    (60, "B",  7.0),
    (50, "C",  6.0),
    (40, "D",  5.0),
    (0,  "F",  0.0),
]


def _compute_grade(total: float, max_marks: float) -> tuple[str, float]:
    pct = (total / max_marks) * 100 if max_marks > 0 else 0
    for threshold, grade, gp in GRADE_TABLE:
        if pct >= threshold:
            return grade, gp
    return "F", 0.0


class MarkUpsert(BaseModel):
    student_username: str
    subject: str
    semester: int = 1
    internal_marks: Optional[float] = None
    external_marks: Optional[float] = None
    practical_marks: Optional[float] = None
    max_marks: float = 100


@router.get("/my")
def get_my_marks(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Students only")
    marks = session.exec(
        select(SubjectMark).where(SubjectMark.student_username == current_user.username)
    ).all()
    return _marks_response(marks)


@router.get("/student/{username}")
def get_student_marks(
    username: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")
    marks = session.exec(
        select(SubjectMark).where(SubjectMark.student_username == username)
    ).all()
    return _marks_response(marks)


@router.put("")
def upsert_mark(
    body: MarkUpsert,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    existing = session.exec(
        select(SubjectMark).where(
            SubjectMark.student_username == body.student_username,
            SubjectMark.subject == body.subject,
            SubjectMark.semester == body.semester,
        )
    ).first()

    total = sum(filter(None, [body.internal_marks, body.external_marks, body.practical_marks]))
    grade, _ = _compute_grade(total, body.max_marks)

    if existing:
        existing.internal_marks = body.internal_marks
        existing.external_marks = body.external_marks
        existing.practical_marks = body.practical_marks
        existing.max_marks = body.max_marks
        existing.grade = grade
        existing.updated_at = datetime.utcnow()
        session.commit()
        session.refresh(existing)
        return _mark_dict(existing)

    mark = SubjectMark(
        student_username=body.student_username,
        subject=body.subject,
        semester=body.semester,
        internal_marks=body.internal_marks,
        external_marks=body.external_marks,
        practical_marks=body.practical_marks,
        max_marks=body.max_marks,
        grade=grade,
    )
    session.add(mark)
    session.commit()
    session.refresh(mark)
    return _mark_dict(mark)


def _mark_dict(m: SubjectMark) -> dict:
    total = sum(filter(None, [m.internal_marks, m.external_marks, m.practical_marks]))
    _, gp = _compute_grade(total, m.max_marks)
    return {
        "id": m.id,
        "subject": m.subject,
        "semester": m.semester,
        "internal_marks": m.internal_marks,
        "external_marks": m.external_marks,
        "practical_marks": m.practical_marks,
        "total": round(total, 2),
        "max_marks": m.max_marks,
        "percentage": round((total / m.max_marks) * 100, 1) if m.max_marks else 0,
        "grade": m.grade or "N/A",
        "grade_points": gp,
        "updated_at": m.updated_at.isoformat(),
    }


def _marks_response(marks: list) -> dict:
    by_semester: dict = {}
    for m in marks:
        sem = str(m.semester)
        if sem not in by_semester:
            by_semester[sem] = []
        by_semester[sem].append(_mark_dict(m))

    # Compute CGPA per semester
    semesters = []
    all_gps = []
    for sem, subject_marks in sorted(by_semester.items()):
        gps = [s["grade_points"] for s in subject_marks if s["grade_points"] is not None]
        sgpa = round(sum(gps) / len(gps), 2) if gps else 0.0
        all_gps.extend(gps)
        semesters.append({"semester": int(sem), "sgpa": sgpa, "subjects": subject_marks})

    cgpa = round(sum(all_gps) / len(all_gps), 2) if all_gps else 0.0
    return {"cgpa": cgpa, "semesters": semesters}
