from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TrackCreate(BaseModel):
    provider: str
    provider_track_id: str
    title: str
    artist: str
    album: Optional[str] = None
    duration: int
    cover_url: Optional[str] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None

class QueueItemCreate(BaseModel):
    track: TrackCreate
    added_by: str

class TrackResponse(TrackCreate):
    id: int
    model_config = {"from_attributes": True}

class QueueItemResponse(BaseModel):
    id: int
    room_id: int
    track: TrackResponse
    added_by: str
    position: int
    created_at: datetime
    
    model_config = {"from_attributes": True}
