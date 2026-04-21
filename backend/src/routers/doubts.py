from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from ..dependencies import get_session, get_current_user
from ..models import User, UserRole, Doubt, DoubtMessage, DoubtStatus, MessageRole, Notification, NotificationType
from ..llm_service import classify_doubt, solve_doubt

router = APIRouter(prefix="/doubts", tags=["doubts"])


class DoubtCreate(BaseModel):
    text: str
    subject: Optional[str] = None
    auto_solve: bool = True


class DoubtReply(BaseModel):
    text: str


class DoubtResolve(BaseModel):
    teacher_note: Optional[str] = None


@router.post("")
async def create_doubt(
    body: DoubtCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.STUDENT,):
        raise HTTPException(status_code=403, detail="Only students can submit doubts")

    # AI classification
    classification = await classify_doubt(body.text)
    subject = body.subject or classification.get("subject", "General")
    confidence = classification.get("confidence", 0.5)

    # Find best matching teacher (least load, matching subject)
    teacher = _find_teacher(session, subject)

    doubt = Doubt(
        student_username=current_user.username,
        teacher_username=teacher.username if teacher else None,
        text=body.text,
        subject=subject,
        confidence=confidence,
        status=DoubtStatus.QUEUED,
    )
    session.add(doubt)
    session.flush()

    # Auto-solve with AI
    ai_answer = None
    if body.auto_solve:
        ai_answer = await solve_doubt(body.text, subject)
        doubt.ai_answer = ai_answer
        # Add AI message to thread
        ai_msg = DoubtMessage(
            doubt_id=doubt.id,
            sender_username="cogni-ai",
            role=MessageRole.AI,
            text=ai_answer,
        )
        session.add(ai_msg)

    # Notify teacher
    if teacher:
        notif = Notification(
            user_username=teacher.username,
            title="New Doubt Assigned",
            message=f"{current_user.full_name or current_user.username} asked: {body.text[:80]}...",
            notification_type=NotificationType.DOUBT,
        )
        session.add(notif)
        doubt.status = DoubtStatus.IN_PROGRESS

    session.commit()
    session.refresh(doubt)
    return {
        "id": doubt.id,
        "text": doubt.text,
        "subject": doubt.subject,
        "confidence": doubt.confidence,
        "status": doubt.status,
        "ai_answer": doubt.ai_answer,
        "teacher_username": doubt.teacher_username,
        "created_at": doubt.created_at,
    }


@router.get("/my")
def get_my_doubts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role == UserRole.STUDENT:
        doubts = session.exec(
            select(Doubt).where(Doubt.student_username == current_user.username).order_by(Doubt.created_at.desc())
        ).all()
    elif current_user.role in (UserRole.TEACHER, UserRole.ADMIN):
        doubts = session.exec(
            select(Doubt).where(Doubt.teacher_username == current_user.username).order_by(Doubt.created_at.desc())
        ).all()
    else:
        doubts = []
    return [_doubt_dict(d, session) for d in doubts]


@router.get("/all")
def get_all_doubts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")
    doubts = session.exec(select(Doubt).order_by(Doubt.created_at.desc())).all()
    return [_doubt_dict(d, session) for d in doubts]


@router.get("/{doubt_id}/messages")
def get_doubt_messages(
    doubt_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doubt = session.get(Doubt, doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")
    _check_access(doubt, current_user)

    msgs = session.exec(
        select(DoubtMessage).where(DoubtMessage.doubt_id == doubt_id).order_by(DoubtMessage.created_at)
    ).all()
    # Mark as read
    for m in msgs:
        if m.sender_username != current_user.username and not m.is_read:
            m.is_read = True
    session.commit()
    return [{"id": m.id, "sender": m.sender_username, "role": m.role, "text": m.text, "created_at": m.created_at} for m in msgs]


@router.post("/{doubt_id}/reply")
def reply_to_doubt(
    doubt_id: int,
    body: DoubtReply,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doubt = session.get(Doubt, doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")
    _check_access(doubt, current_user)

    role = MessageRole.TEACHER if current_user.role in (UserRole.TEACHER, UserRole.ADMIN) else MessageRole.STUDENT
    msg = DoubtMessage(
        doubt_id=doubt_id,
        sender_username=current_user.username,
        role=role,
        text=body.text,
    )
    session.add(msg)

    if current_user.role in (UserRole.TEACHER, UserRole.ADMIN):
        doubt.status = DoubtStatus.IN_PROGRESS
        doubt.updated_at = datetime.utcnow()
        # Notify student
        notif = Notification(
            user_username=doubt.student_username,
            title="Teacher replied to your doubt",
            message=f"{current_user.full_name or current_user.username}: {body.text[:80]}",
            notification_type=NotificationType.DOUBT,
        )
        session.add(notif)

    session.commit()
    return {"status": "sent"}


@router.post("/{doubt_id}/resolve")
def resolve_doubt(
    doubt_id: int,
    body: DoubtResolve = DoubtResolve(),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doubt = session.get(Doubt, doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")

    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN) and current_user.username != doubt.student_username:
        raise HTTPException(status_code=403, detail="Access denied")

    doubt.status = DoubtStatus.RESOLVED
    doubt.updated_at = datetime.utcnow()

    if body.teacher_note:
        msg = DoubtMessage(
            doubt_id=doubt_id,
            sender_username=current_user.username,
            role=MessageRole.SYSTEM,
            text=f"Doubt resolved. {body.teacher_note}",
        )
        session.add(msg)

    notif = Notification(
        user_username=doubt.student_username,
        title="Doubt Resolved",
        message=f"Your doubt about {doubt.subject} has been resolved.",
        notification_type=NotificationType.DOUBT,
    )
    session.add(notif)
    session.commit()
    return {"status": "resolved"}


# ── Helpers ────────────────────────────────────────────────────────────────

def _find_teacher(session: Session, subject: str) -> Optional[User]:
    teachers = session.exec(
        select(User).where(User.role == UserRole.TEACHER)
    ).all()
    if not teachers:
        return None

    import json
    best = None
    for t in teachers:
        subjects = json.loads(t.subjects_json) if t.subjects_json else []
        # Check subject match (case-insensitive partial)
        if any(subject.lower() in s.lower() or s.lower() in subject.lower() for s in subjects):
            # Count current active doubts
            active = session.exec(
                select(Doubt).where(
                    Doubt.teacher_username == t.username,
                    Doubt.status != DoubtStatus.RESOLVED,
                )
            ).all()
            if len(active) < t.max_load:
                if best is None:
                    best = (t, len(active))
                elif len(active) < best[1]:
                    best = (t, len(active))

    if best:
        return best[0]
    # Fallback: any teacher with capacity
    for t in teachers:
        active = session.exec(
            select(Doubt).where(
                Doubt.teacher_username == t.username,
                Doubt.status != DoubtStatus.RESOLVED,
            )
        ).all()
        if len(active) < t.max_load:
            return t
    return teachers[0] if teachers else None


def _check_access(doubt: Doubt, user: User):
    if user.role in (UserRole.ADMIN,):
        return
    if user.role == UserRole.TEACHER and doubt.teacher_username == user.username:
        return
    if user.role == UserRole.STUDENT and doubt.student_username == user.username:
        return
    raise HTTPException(status_code=403, detail="Access denied")


def _doubt_dict(d: Doubt, session: Session) -> dict:
    msgs = session.exec(
        select(DoubtMessage).where(DoubtMessage.doubt_id == d.id)
    ).all()
    return {
        "id": d.id,
        "text": d.text,
        "subject": d.subject,
        "confidence": d.confidence,
        "status": d.status,
        "ai_answer": d.ai_answer,
        "student_username": d.student_username,
        "teacher_username": d.teacher_username,
        "message_count": len(msgs),
        "unread_count": sum(1 for m in msgs if not m.is_read),
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }
