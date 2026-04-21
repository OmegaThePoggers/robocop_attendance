from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class TeacherCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    employee_id: str


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    employee_id: Optional[str] = None


class TeacherResponse(BaseModel):
    id: str
    user_id: str
    employee_id: str
    name: str    # from user.name
    email: str   # from user.email

    model_config = {"from_attributes": True}
