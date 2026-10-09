from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RoomCreate(BaseModel):
    name: str
    is_private: bool = False
    host_name: Optional[str] = None

class RoomJoin(BaseModel):
    name: str

class RoomLeave(BaseModel):
    name: Optional[str] = None

class RoomResponse(BaseModel):
    id: int
    name: str
    host_id: Optional[int]
    room_code: str
    is_private: bool
    created_at: datetime
    ended_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
