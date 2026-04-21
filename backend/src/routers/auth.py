import json
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
from typing import Optional

from ..dependencies import get_session, get_embedding_loader, limiter, get_current_user
from ..models import User, UserCreate, UserRole, Token
from ..embedding_loader import EmbeddingLoader
from ..auth_service import (
    verify_password,
    create_access_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update status to online
    user.status = "online"
    session.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer", role=user.role.value)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    current_user.status = "offline"
    session.commit()
    return {"status": "logged out"}


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return _user_dict(current_user)


@router.post("/register")
@limiter.limit("3/minute")
async def register_user(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(None),
    sap_id: str = Form(None),
    email: str = Form(None),
    department: str = Form(None),
    course: str = Form(None),
    roll_number: str = Form(None),
    role: UserRole = Form(UserRole.STUDENT),
    selfie: UploadFile = File(...),
    session: Session = Depends(get_session),
    loader: EmbeddingLoader = Depends(get_embedding_loader),
):
    existing = session.exec(select(User).where(User.username == username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    dataset_dir = os.getenv("DATASET_PATH")
    if not dataset_dir:
        dataset_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "dataset",
        )

    student_dir = os.path.join(dataset_dir, username)
    os.makedirs(student_dir, exist_ok=True)

    file_path = os.path.join(student_dir, "selfie.jpg")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(selfie.file, buffer)

    try:
        loader.load_embeddings()
    except Exception as e:
        shutil.rmtree(student_dir)
        raise HTTPException(status_code=400, detail=f"Could not extract face from image: {e}")

    db_user = User(
        username=username,
        password_hash=get_password_hash(password),
        role=role,
        full_name=full_name,
        sap_id=sap_id,
        email=email,
        department=department,
        course=course,
        roll_number=roll_number,
        face_identity=username,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return _user_dict(db_user)


@router.post("/register-teacher")
@limiter.limit("3/minute")
async def register_teacher(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(None),
    email: str = Form(None),
    department: str = Form(None),
    subjects: str = Form(None),   # comma-separated
    max_load: int = Form(5),
    teacher_id: str = Form(None),
    session: Session = Depends(get_session),
):
    existing = session.exec(select(User).where(User.username == username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Parse subjects
    subjects_json = None
    if subjects:
        subject_list = [s.strip() for s in subjects.split(",") if s.strip()]
        subjects_json = json.dumps(subject_list)

    db_user = User(
        username=username,
        password_hash=get_password_hash(password),
        role=UserRole.TEACHER,
        full_name=full_name,
        email=email,
        department=department,
        sap_id=teacher_id,
        subjects_json=subjects_json,
        max_load=max_load,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return _user_dict(db_user)


@router.put("/me")
async def update_profile(
    full_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    course: Optional[str] = Form(None),
    roll_number: Optional[str] = Form(None),
    subjects: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if full_name is not None:
        current_user.full_name = full_name
    if email is not None:
        current_user.email = email
    if department is not None:
        current_user.department = department
    if course is not None:
        current_user.course = course
    if roll_number is not None:
        current_user.roll_number = roll_number
    if subjects is not None:
        subject_list = [s.strip() for s in subjects.split(",") if s.strip()]
        current_user.subjects_json = json.dumps(subject_list)

    session.commit()
    session.refresh(current_user)
    return _user_dict(current_user)


def _user_dict(u: User) -> dict:
    subjects = []
    if u.subjects_json:
        try:
            subjects = json.loads(u.subjects_json)
        except Exception:
            pass
    return {
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "full_name": u.full_name,
        "email": u.email,
        "sap_id": u.sap_id,
        "roll_number": u.roll_number,
        "department": u.department,
        "course": u.course,
        "subjects": subjects,
        "max_load": u.max_load,
        "status": u.status,
        "class_id": u.class_id,
        "face_identity": u.face_identity,
    }
