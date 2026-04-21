from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from ..dependencies import get_session, get_current_user
from ..models import User, UserRole, Assignment, Submission, SubmissionStatus, Notification, NotificationType

router = APIRouter(prefix="/assignments", tags=["assignments"])


class AssignmentCreate(BaseModel):
    title: str
    subject: str
    description: str
    due_date: Optional[str] = None   # ISO datetime string
    max_marks: int = 100
    class_id: Optional[int] = None


class SubmissionCreate(BaseModel):
    submission_text: str


class GradeSubmission(BaseModel):
    grade: float
    feedback: Optional[str] = None


@router.post("")
def create_assignment(
    body: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")

    due = None
    if body.due_date:
        try:
            due = datetime.fromisoformat(body.due_date.replace("Z", "+00:00"))
        except Exception:
            pass

    assignment = Assignment(
        title=body.title,
        subject=body.subject,
        description=body.description,
        due_date=due,
        max_marks=body.max_marks,
        teacher_username=current_user.username,
        class_id=body.class_id,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return _assignment_dict(assignment)


@router.get("")
def list_assignments(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role in (UserRole.TEACHER, UserRole.ADMIN):
        if current_user.role == UserRole.ADMIN:
            assignments = session.exec(select(Assignment).order_by(Assignment.created_at.desc())).all()
        else:
            assignments = session.exec(
                select(Assignment).where(Assignment.teacher_username == current_user.username).order_by(Assignment.created_at.desc())
            ).all()
        result = []
        for a in assignments:
            d = _assignment_dict(a)
            subs = session.exec(select(Submission).where(Submission.assignment_id == a.id)).all()
            d["submission_count"] = len(subs)
            d["graded_count"] = sum(1 for s in subs if s.status == SubmissionStatus.GRADED)
            result.append(d)
        return result
    else:
        # Student: get all assignments (optionally filtered by class)
        assignments = session.exec(select(Assignment).order_by(Assignment.created_at.desc())).all()
        result = []
        for a in assignments:
            d = _assignment_dict(a)
            sub = session.exec(
                select(Submission).where(
                    Submission.assignment_id == a.id,
                    Submission.student_username == current_user.username,
                )
            ).first()
            d["my_submission"] = _submission_dict(sub) if sub else None
            result.append(d)
        return result


@router.get("/{assignment_id}")
def get_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return _assignment_dict(assignment)


@router.post("/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    body: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit assignments")

    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    existing = session.exec(
        select(Submission).where(
            Submission.assignment_id == assignment_id,
            Submission.student_username == current_user.username,
        )
    ).first()

    if existing:
        existing.submission_text = body.submission_text
        existing.status = SubmissionStatus.SUBMITTED
        existing.submitted_at = datetime.utcnow()
        session.commit()
        session.refresh(existing)
        return _submission_dict(existing)

    sub = Submission(
        assignment_id=assignment_id,
        student_username=current_user.username,
        submission_text=body.submission_text,
        status=SubmissionStatus.SUBMITTED,
        submitted_at=datetime.utcnow(),
    )
    session.add(sub)

    # Notify teacher
    notif = Notification(
        user_username=assignment.teacher_username,
        title="New Submission",
        message=f"{current_user.full_name or current_user.username} submitted '{assignment.title}'",
        notification_type=NotificationType.ASSIGNMENT,
    )
    session.add(notif)
    session.commit()
    session.refresh(sub)
    return _submission_dict(sub)


@router.get("/{assignment_id}/submissions")
def get_submissions(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")
    subs = session.exec(
        select(Submission).where(Submission.assignment_id == assignment_id)
    ).all()
    return [_submission_dict(s) for s in subs]


@router.post("/{assignment_id}/submissions/{submission_id}/grade")
def grade_submission(
    assignment_id: int,
    submission_id: int,
    body: GradeSubmission,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    sub = session.get(Submission, submission_id)
    if not sub or sub.assignment_id != assignment_id:
        raise HTTPException(status_code=404, detail="Submission not found")

    sub.grade = body.grade
    sub.feedback = body.feedback
    sub.status = SubmissionStatus.GRADED

    assignment = session.get(Assignment, assignment_id)
    notif = Notification(
        user_username=sub.student_username,
        title="Assignment Graded",
        message=f"Your submission for '{assignment.title}' was graded: {body.grade}/{assignment.max_marks}",
        notification_type=NotificationType.ASSIGNMENT,
    )
    session.add(notif)
    session.commit()
    session.refresh(sub)
    return _submission_dict(sub)


def _assignment_dict(a: Assignment) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "subject": a.subject,
        "description": a.description,
        "due_date": a.due_date.isoformat() if a.due_date else None,
        "max_marks": a.max_marks,
        "teacher_username": a.teacher_username,
        "class_id": a.class_id,
        "created_at": a.created_at.isoformat(),
    }


def _submission_dict(s: Submission) -> dict:
    return {
        "id": s.id,
        "assignment_id": s.assignment_id,
        "student_username": s.student_username,
        "submission_text": s.submission_text,
        "status": s.status,
        "grade": s.grade,
        "feedback": s.feedback,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
    }
