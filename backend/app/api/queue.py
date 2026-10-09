from fastapi import APIRouter, HTTPException
from app.core import store
from app.schemas.queue import QueueItemCreate
from app.websocket.manager import manager

router = APIRouter()

@router.get("/{room_code}/queue")
def get_queue(room_code: str):
    room = store.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room["queue"]

@router.post("/{room_code}/queue")
async def add_to_queue(room_code: str, item_in: QueueItemCreate):
    room = store.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    track_id = item_in.track.provider_track_id
    if track_id not in room["tracks"]:
        # Store track info
        room["tracks"][track_id] = {
            "id": room["_track_seq"],
            **item_in.track.model_dump()
        }
        room["_track_seq"] += 1
        
    track_info = room["tracks"][track_id]
    queue_id = room["_queue_seq"]
    room["_queue_seq"] += 1
    
    new_item = {
        "id": queue_id,
        "room_id": 1,
        "track_id": track_info["id"],
        "added_by": item_in.added_by,
        "position": len(room["queue"]) + 1,
        "track": track_info
    }
    room["queue"].append(new_item)
    
    await manager.broadcast(room["room_code"], {"type": "QUEUE_UPDATED"})
    return new_item

@router.delete("/{room_code}/queue/{item_id}")
async def remove_from_queue(room_code: str, item_id: int):
    room = store.get_room(room_code)
    if not room:
        return {"status": "ok"}
    
    new_q = [i for i in room["queue"] if i["id"] != item_id]
    if len(new_q) != len(room["queue"]):
        room["queue"] = new_q
        await manager.broadcast(room["room_code"], {"type": "QUEUE_UPDATED"})
    return {"status": "ok"}
