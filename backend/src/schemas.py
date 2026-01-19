from typing import List, Optional
from pydantic import BaseModel

class MapUserRequest(BaseModel):
    username: str
    face_identity: str
