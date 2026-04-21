from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel

from ..dependencies import get_session, get_current_user
from ..models import User, UserRole, Schedule

router = APIRouter(prefix="/schedule", tags=["schedule"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class ScheduleCreate(BaseModel):
    class_id: Optional[int] = None
    subject: str
    day_of_week: int   # 0–6
    start_time: str    # "09:00"
    end_time: str      # "10:00"
    room: Optional[str] = None
    schedule_type: str = "lecture"


@router.get("")
def get_schedule(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    import json

    if current_user.role == UserRole.STUDENT:
        # Get schedule for student's class
        if current_user.class_id:
            entries = session.exec(
                select(Schedule).where(Schedule.class_id == current_user.class_id).order_by(Schedule.day_of_week, Schedule.start_time)
            ).all()
        else:
            entries = []
    elif current_user.role == UserRole.TEACHER:
        entries = session.exec(
            select(Schedule).where(Schedule.teacher_username == current_user.username).order_by(Schedule.day_of_week, Schedule.start_time)
        ).all()
    else:
        entries = session.exec(select(Schedule).order_by(Schedule.day_of_week, Schedule.start_time)).all()

    return [_schedule_dict(e) for e in entries]


@router.post("")
def create_schedule(
    body: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    if body.day_of_week < 0 or body.day_of_week > 6:
        raise HTTPException(status_code=400, detail="day_of_week must be 0-6")

    entry = Schedule(
        class_id=body.class_id,
        teacher_username=current_user.username,
        subject=body.subject,
        day_of_week=body.day_of_week,
        start_time=body.start_time,
        end_time=body.end_time,
        room=body.room,
        schedule_type=body.schedule_type,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return _schedule_dict(entry)


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")
    entry = session.get(Schedule, schedule_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(entry)
    session.commit()
    return {"status": "deleted"}


def _schedule_dict(e: Schedule) -> dict:
    return {
        "id": e.id,
        "class_id": e.class_id,
        "teacher_username": e.teacher_username,
        "subject": e.subject,
        "day": DAYS[e.day_of_week],
        "day_of_week": e.day_of_week,
        "start_time": e.start_time,
        "end_time": e.end_time,
        "room": e.room,
        "schedule_type": e.schedule_type,
    }
