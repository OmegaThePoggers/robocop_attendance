from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from ..dependencies import get_session, get_current_user
from ..models import User, Notification, NotificationType

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationCreate(BaseModel):
    user_username: str
    title: str
    message: str
    notification_type: NotificationType = NotificationType.ANNOUNCEMENT
    is_urgent: bool = False


@router.get("")
def get_notifications(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    notifs = session.exec(
        select(Notification)
        .where(Notification.user_username == current_user.username)
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()
    return [_notif_dict(n) for n in notifs]


@router.post("/read/{notif_id}")
def mark_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    n = session.get(Notification, notif_id)
    if n and n.user_username == current_user.username:
        n.is_read = True
        session.commit()
    return {"status": "ok"}


@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    notifs = session.exec(
        select(Notification).where(
            Notification.user_username == current_user.username,
            Notification.is_read == False,
        )
    ).all()
    for n in notifs:
        n.is_read = True
    session.commit()
    return {"marked": len(notifs)}


@router.post("/broadcast")
def broadcast_notification(
    body: NotificationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from ..models import UserRole
    if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")

    notif = Notification(
        user_username=body.user_username,
        title=body.title,
        message=body.message,
        notification_type=body.notification_type,
        is_urgent=body.is_urgent,
    )
    session.add(notif)
    session.commit()
    session.refresh(notif)
    return _notif_dict(notif)


def _notif_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "type": n.notification_type,
        "is_urgent": n.is_urgent,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    }
