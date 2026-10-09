from fastapi import APIRouter
router = APIRouter()

MOCK_TRACKS = [
    {
        "id": "track_1",
        "provider": "external",
        "provider_track_id": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "title": "JamRoom Sync Demo Stream",
        "artist": "SoundHelix API",
        "album": "User Choice",
        "duration": 372,
        "cover_url": "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17",
    },
    {
        "id": "track_2",
        "provider": "external",
        "provider_track_id": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "title": "Backup Sync Demo",
        "artist": "SoundHelix API",
        "album": "User Choice",
        "duration": 372,
        "cover_url": "https://images.unsplash.com/photo-1557672172-298e090bd0f1",
    }
]

@router.get("/")
def get_tracks():
    return MOCK_TRACKS

@router.get("/{track_id}")
def get_track(track_id: str):
    for t in MOCK_TRACKS:
        if t["id"] == track_id:
            return t
    return {"error": "Not Found"}
