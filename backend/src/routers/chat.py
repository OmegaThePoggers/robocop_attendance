"""
REST-based direct messaging between students and teachers.
Also provides AI chat endpoint powered by Groq/Gemini.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_, and_
from pydantic import BaseModel

from ..dependencies import get_session, get_current_user
from ..models import User, UserRole, DirectMessage
from ..llm_service import ai_chat

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    recipient_username: str
    text: str


class AIChatMessage(BaseModel):
    messages: list  # [{"role": "user"|"assistant", "content": str}]


@router.get("/contacts")
def get_contacts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role == UserRole.STUDENT:
        contacts = session.exec(select(User).where(User.role == UserRole.TEACHER)).all()
    elif current_user.role == UserRole.TEACHER:
        contacts = session.exec(select(User).where(User.role == UserRole.STUDENT)).all()
    else:
        contacts = session.exec(select(User)).all()

    return [
        {
            "username": u.username,
            "full_name": u.full_name or u.username,
            "role": u.role,
            "status": u.status,
            "department": u.department,
            "course": u.course,
        }
        for u in contacts if u.username != current_user.username
    ]


@router.get("/messages/{other_username}")
def get_messages(
    other_username: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    me = current_user.username
    msgs = session.exec(
        select(DirectMessage).where(
            or_(
                and_(DirectMessage.sender_username == me, DirectMessage.recipient_username == other_username),
                and_(DirectMessage.sender_username == other_username, DirectMessage.recipient_username == me),
            )
        ).order_by(DirectMessage.created_at).limit(100)
    ).all()

    # Mark incoming messages as read
    for m in msgs:
        if m.recipient_username == me and not m.is_read:
            m.is_read = True
    session.commit()

    return [
        {
            "id": m.id,
            "sender": m.sender_username,
            "text": m.text,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]


@router.post("/messages")
def send_message(
    body: ChatMessage,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    other = session.exec(select(User).where(User.username == body.recipient_username)).first()
    if not other:
        raise HTTPException(status_code=404, detail="Recipient not found")

    msg = DirectMessage(
        sender_username=current_user.username,
        recipient_username=body.recipient_username,
        text=body.text,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return {
        "id": msg.id,
        "sender": msg.sender_username,
        "text": msg.text,
        "created_at": msg.created_at.isoformat(),
    }


@router.post("/ai")
async def chat_with_ai(
    body: AIChatMessage,
    current_user: User = Depends(get_current_user),
):
    response = await ai_chat(body.messages)
    return {"response": response, "role": "assistant"}
