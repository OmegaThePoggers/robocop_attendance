import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel

from ..dependencies import get_session, get_current_user
from ..models import User, UserRole, Resource, ResourceType

router = APIRouter(prefix="/library", tags=["library"])


class ResourceCreate(BaseModel):
    title: str
    subject: str
    resource_type: ResourceType = ResourceType.LINK
    author: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[list] = None
    url: Optional[str] = None


@router.get("")
def list_resources(
    subject: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(Resource)
    resources = session.exec(query.order_by(Resource.created_at.desc())).all()

    result = [_resource_dict(r) for r in resources]

    if subject:
        result = [r for r in result if subject.lower() in r["subject"].lower()]
    if resource_type:
        result = [r for r in result if r["resource_type"] == resource_type]

    return result


@router.post("")
def create_resource(
    body: ResourceCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only teachers can add resources")

    resource = Resource(
        title=body.title,
        subject=body.subject,
        resource_type=body.resource_type,
        author=body.author,
        description=body.description,
        difficulty=body.difficulty,
        tags_json=json.dumps(body.tags or []),
        url=body.url,
        uploaded_by=current_user.username,
    )
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return _resource_dict(resource)


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")
    r = session.get(Resource, resource_id)
    if not r:
        raise HTTPException(status_code=404, detail="Resource not found")
    session.delete(r)
    session.commit()
    return {"status": "deleted"}


def _resource_dict(r: Resource) -> dict:
    tags = []
    if r.tags_json:
        try:
            tags = json.loads(r.tags_json)
        except Exception:
            pass
    return {
        "id": r.id,
        "title": r.title,
        "subject": r.subject,
        "resource_type": r.resource_type,
        "author": r.author,
        "description": r.description,
        "difficulty": r.difficulty,
        "tags": tags,
        "url": r.url,
        "uploaded_by": r.uploaded_by,
        "created_at": r.created_at.isoformat(),
    }
