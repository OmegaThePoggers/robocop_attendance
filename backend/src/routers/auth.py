from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
from ..database import engine, get_session
from ..models import User, UserCreate, UserRole, Token
from .. import dependencies
import os
import shutil
from ..auth_service import (
    verify_password, 
    create_access_token, 
    get_password_hash, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(tags=["auth"])

@router.post("/token", response_model=dict)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == form_data.username)).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role.value},
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}

@router.post("/register", response_model=User)
async def register_user(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(None),
    sap_id: str = Form(None),
    role: UserRole = Form(UserRole.STUDENT),
    selfie: UploadFile = File(...)
):
    with Session(engine) as session:
        # Check existing
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Determine dataset dir
        dataset_dir = os.getenv("DATASET_PATH")
        if not dataset_dir:
            dataset_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dataset")
            
        student_dir = os.path.join(dataset_dir, username)
        os.makedirs(student_dir, exist_ok=True)
        
        file_path = os.path.join(student_dir, "selfie.jpg")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(selfie.file, buffer)
            
        # Reload embeddings to include the new student
        try:
            if dependencies.embedding_loader:
                dependencies.embedding_loader.load_embeddings()
            else:
                raise RuntimeError("Embedding loader not initialized")
        except Exception as e:
            # If face not found, rollback
            shutil.rmtree(student_dir)
            raise HTTPException(status_code=400, detail=f"Could not extract face from image: {e}")
            
        # Create user
        db_user = User(
            username=username,
            password_hash=get_password_hash(password),
            role=role,
            full_name=full_name,
            sap_id=sap_id,
            face_identity=username  # Auto map identity to username
        )
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user

@router.post("/register-teacher", response_model=User)
async def register_teacher(user_in: UserCreate):
    # Enforce teacher role
    user_in.role = UserRole.TEACHER
    
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == user_in.username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        db_user = User(
            username=user_in.username,
            password_hash=get_password_hash(user_in.password),
            role=user_in.role,
            full_name=user_in.full_name,
        )
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user
