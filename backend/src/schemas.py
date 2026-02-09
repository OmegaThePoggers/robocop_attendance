from typing import List, Optional
from pydantic import BaseModel
from .models import Dispute

class MapUserRequest(BaseModel):
    username: str
    face_identity: str

class DisputeRead(Dispute):
    evidence_path: Optional[str] = None
    session_name: Optional[str] = None
