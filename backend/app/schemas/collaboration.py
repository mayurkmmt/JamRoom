from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageCreate(BaseModel):
    author_name: str
    message: str

class MessageResponse(BaseModel):
    id: int
    author_name: str
    message: str
    created_at: datetime
    
    model_config = {"from_attributes": True}

class ReactionCreate(BaseModel):
    reaction: str
    track_id: Optional[str] = None
    
class ReactionResponse(BaseModel):
    id: int
    reaction: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
