import datetime
from fastapi import APIRouter, HTTPException
from app.core import store
from app.schemas.collaboration import MessageCreate, ReactionCreate
from app.websocket.manager import manager

router = APIRouter()

@router.get("/{room_code}/messages")
def get_messages(room_code: str):
    room = store.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    return room["messages"]

@router.post("/{room_code}/messages")
async def post_message(room_code: str, msg_in: MessageCreate):
    room = store.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    msg_id = room["_message_seq"]
    room["_message_seq"] += 1
    
    new_msg = {
        "id": msg_id,
        "room_id": 1,
        "author_name": msg_in.author_name,
        "message": msg_in.message,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    room["messages"].append(new_msg)
    # keep last 100 messages
    room["messages"] = room["messages"][-100:]
    
    await manager.broadcast(room["room_code"], {
        "type": "CHAT_MESSAGE",
        "message": msg_in.message,
        "author": msg_in.author_name,
        "id": msg_id
    })
    
    return new_msg

@router.post("/{room_code}/reactions")
async def post_reaction(room_code: str, react_in: ReactionCreate):
    room = store.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    react_id = room["_reaction_seq"]
    room["_reaction_seq"] += 1
    
    new_react = {
        "id": react_id,
        "room_id": 1,
        "reaction": react_in.reaction,
        "track_id": react_in.track_id
    }
    room["reactions"].append(new_react)
    
    await manager.broadcast(room["room_code"], {
        "type": "REACTION",
        "reaction": react_in.reaction,
        "trackId": react_in.track_id
    })
    
    return new_react
