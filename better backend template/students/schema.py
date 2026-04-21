from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class StudentCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    sap_id: str


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    sap_id: Optional[str] = None


class StudentResponse(BaseModel):
    id: str
    user_id: str
    sap_id: str
    name: str      # from user.name via service
    email: str     # from user.email via service

    model_config = {"from_attributes": True}


class FaceEnrollResponse(BaseModel):
    id: str
    student_id: str
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}
