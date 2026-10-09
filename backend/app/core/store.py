from typing import Dict, List, Any
import time
import os
import shutil

# Basic in-memory store
# active_rooms maps room_code (str) -> Room Data
active_rooms: Dict[str, Dict[str, Any]] = {}

def get_room(room_code: str):
    return active_rooms.get(room_code.upper())

def create_room(room_code: str, name: str, host_name: str = "Host"):
    room_code = room_code.upper()
    host_name = host_name or "Host"
    default_track_id_1 = "default_track_bairan"
    default_track_1 = {
        "id": 1,
        "provider": "local",
        "provider_track_id": default_track_id_1,
        "title": "Bairan - Banjaare",
        "artist": "Banjaare",
        "thumbnail_url": "", 
        "duration": 0,
        "url": "/Bairan - Banjaare.mp3"
    }
    
    default_track_id_2 = "default_track_khat"
    default_track_2 = {
        "id": 2,
        "provider": "local",
        "provider_track_id": default_track_id_2,
        "title": "Navjot Ahuja - Khat (Official Audio)",
        "artist": "Navjot Ahuja",
        "thumbnail_url": "", 
        "duration": 0,
        "url": "/Navjot Ahuja - Khat (Official Audio).mp3"
    }
    
    default_track_id_3 = "default_track_vibes"
    default_track_3 = {
        "id": 3,
        "provider": "local",
        "provider_track_id": default_track_id_3,
        "title": "Vibes of Love Mashup",
        "artist": "Arijit Singh",
        "thumbnail_url": "", 
        "duration": 0,
        "url": "/Vibes of Love Mashup 2026 Rolex Music Love Mashup Romantic Songs Arijit Singh Mashup Songs.mp3"
    }

    active_rooms[room_code] = {
        "room_code": room_code,
        "name": name,
        "participants": [{
            "id": "host",
            "name": host_name,
            "role": "host"
        }],
        "queue": [
            {
                "id": 1,
                "room_id": 1,
                "track_id": 1,
                "added_by": "System",
                "position": 1,
                "track": default_track_1
            },
            {
                "id": 2,
                "room_id": 1,
                "track_id": 2,
                "added_by": "System",
                "position": 2,
                "track": default_track_2
            },
            {
                "id": 3,
                "room_id": 1,
                "track_id": 3,
                "added_by": "System",
                "position": 3,
                "track": default_track_3
            }
        ],
        "messages": [],
        "reactions": [],
        "playback": {
            "status": "paused",
            "position": 0.0,
            "track_id": default_track_id_1,
            "server_time": time.time()
        },
        "ended_at": None,
        "_participant_seq": 1,
        "_queue_seq": 4,
        "_message_seq": 1,
        "_reaction_seq": 1,
        "_track_seq": 4,
        "tracks": { default_track_id_1: default_track_1, default_track_id_2: default_track_2, default_track_id_3: default_track_3 }
    }
    return active_rooms[room_code]

def end_room(room_code: str):
    room_code = room_code.upper()
    if room_code in active_rooms:
        active_rooms[room_code]["ended_at"] = time.time()
        
        # Cleanup uploaded files
        try:
            upload_dir = os.path.join("uploads", room_code)
            if os.path.exists(upload_dir):
                shutil.rmtree(upload_dir)
        except Exception as e:
            print(f"Failed to delete uploaded files for room {room_code}: {e}")
        
        # Note: If we wanted to, we could delete it completely here
        # del active_rooms[room_code]
