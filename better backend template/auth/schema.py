from datetime import datetime
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    identifier: str
