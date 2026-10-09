import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core import store
from app.websocket.manager import manager


router = APIRouter()

@router.websocket("/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    room_record = store.get_room(room_code)
    participants_data = []
    
    if room_record:
        # Mocking or extracting true participants
        participants_data = room_record["participants"]

    # We reuse manager.connect which was storing a room state object internally
    room = await manager.connect(room_code, websocket)
    try:
        # Ensure we sync standard initial store state if it wasn't tracked by the manager properly
        # The manager itself actually holds its own state. Let's merge manager playback state with store.
        playback_state = room.playback
        if room_record:
            playback_state.status = room_record["playback"]["status"]
            playback_state.position = room_record["playback"]["position"]
            playback_state.track_id = room_record["playback"]["track_id"]
            playback_state.server_time = room_record["playback"]["server_time"]

        await websocket.send_json({
            "type": "ROOM_STATE",
            "roomId": room_code,
            "trackId": playback_state.track_id,
            "status": playback_state.status,
            "position": playback_state.position,
            "serverTime": playback_state.server_time,
            "currentServerTime": time.time(),
            "participants": participants_data
        })
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")
            
            if event_type in ["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE", "REQUEST_WEBRTC", "BROADCAST_STARTED"]:
                await manager.broadcast(room_code, dict(data), exclude=websocket)
            elif event_type == "TRANSFER_HOST":
                new_host_name = data.get("newHostName")
                if room_record:
                    # Update roles in room_record
                    for p in room_record["participants"]:
                        if p["name"] == new_host_name:
                            p["role"] = "host"
                        elif p["role"] == "host": # demote the old host
                            p["role"] = "participant"
                    
                    room_record["host_name"] = new_host_name
                    
                await manager.broadcast(room_code, {
                    "type": "HOST_TRANSFERRED",
                    "newHostName": new_host_name,
                    "participants": room_record["participants"] if room_record else []
                })
            
            elif event_type in ["PLAY", "PAUSE", "SEEK", "SONG_CHANGED"]:
                # Update authoritative state in manager
                room.playback.status = data.get("status", room.playback.status)
                if event_type == "PLAY":
                    room.playback.status = "playing"
                elif event_type == "PAUSE":
                    room.playback.status = "paused"

                room.playback.position = data.get("position", room.playback.position)
                room.playback.track_id = data.get("trackId", room.playback.track_id)
                room.playback.server_time = time.time()
                
                # Also store it in store
                if room_record:
                    room_record["playback"] = {
                        "status": room.playback.status,
                        "position": room.playback.position,
                        "track_id": room.playback.track_id,
                        "server_time": room.playback.server_time
                    }

                broadcast_data = {
                    "type": event_type,
                    "trackId": room.playback.track_id,
                    "status": room.playback.status,
                    "position": room.playback.position,
                    "serverTime": room.playback.server_time,
                    "currentServerTime": time.time()
                }
                await manager.broadcast(room_code, broadcast_data, exclude=websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(room_code, websocket)
