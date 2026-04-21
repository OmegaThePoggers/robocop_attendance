from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth import service
from auth.schema import LoginRequest, RefreshRequest, TokenResponse, UserResponse, RegisterRequest
from core.database import get_db
from core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await service.authenticate_user(db, body)
    return service.build_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await service.refresh_tokens(db, body.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UserResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    try:
        if body.role == "student":
            from students.schema import StudentCreate
            from students import service as student_service
            student_data = StudentCreate(email=body.email, password=body.password, name=body.name, sap_id=body.identifier)
            await student_service.create_student(db, student_data)
        elif body.role == "teacher":
            from teachers.schema import TeacherCreate
            from teachers import service as teacher_service
            teacher_data = TeacherCreate(email=body.email, password=body.password, name=body.name, employee_id=body.identifier)
            await teacher_service.create_teacher(db, teacher_data)
        else:
            raise HTTPException(status_code=400, detail="Invalid role specified")
    except HTTPException:
        raise
    except Exception as exc:
        from sqlalchemy.exc import IntegrityError
        if isinstance(exc, IntegrityError):
            raise HTTPException(status_code=400, detail="Identifier (SAP ID or Employee ID) already registered")
        raise HTTPException(status_code=500, detail=str(exc))
        
    from auth.model import User
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=500, detail="User created but not found")
    return user
