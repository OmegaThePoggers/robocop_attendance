from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from ..database import engine, get_session
from ..models import User, UserCreate, UserRole, Token
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

@router.post("/register", response_model=User) # Add response model
def register_user(user_create: UserCreate):
    with Session(engine) as session:
        # Check existing
        existing = session.exec(select(User).where(User.username == user_create.username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Create user
        db_user = User(
            username=user_create.username,
            password_hash=get_password_hash(user_create.password),
            role=user_create.role,
            full_name=user_create.full_name,
            face_identity=user_create.face_identity
        )
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user
