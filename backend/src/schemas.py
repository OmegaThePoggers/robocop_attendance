"""
Pydantic schemas for API request/response models.

These schemas provide a clear contract between the backend API and the frontend,
ensuring consistent and predictable JSON structures.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from .models import Dispute, DisputeStatus


# ---------- Auth ----------

class MapUserRequest(BaseModel):
    username: str
    face_identity: str


# ---------- Dispute ----------

class DisputeRead(Dispute):
    evidence_path: Optional[str] = None
    session_name: Optional[str] = None


# ---------- Admin ----------

class AssignClassRequest(BaseModel):
    class_id: int


class ClassCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AssignClassResponse(BaseModel):
    status: str
    user_id: int
    class_id: int


class ClassCreateResponse(BaseModel):
    id: int
    name: str


class MapIdentityResponse(BaseModel):
    status: str
    username: str
    face_identity: str


class CleanupResponse(BaseModel):
    status: str
    records_deleted: int
    files_deleted: int


class TableDataResponse(BaseModel):
    table: str
    total: int
    limit: int
    offset: int
    data: List[dict]


# ---------- Recognition ----------

class BoundingBox(BaseModel):
    bounding_box: List[int]


class FaceResult(BaseModel):
    name: str
    bounding_box: List[int]
    distance: float


class RecognitionResponse(BaseModel):
    faces: List[FaceResult]


class DetectFacesResponse(BaseModel):
    faces: List[BoundingBox]


# ---------- Session Report ----------

class SessionReportResponse(BaseModel):
    present: List[str]
    absent: List[str]
