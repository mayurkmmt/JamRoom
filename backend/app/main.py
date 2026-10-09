from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import rooms, queue, collaboration, tracks, uploads
from app.websocket import handlers
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="JamRoom API")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's a POC, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(queue.router, prefix="/api/rooms", tags=["Queue"])
app.include_router(collaboration.router, prefix="/api/rooms", tags=["Collaboration"])
app.include_router(tracks.router, prefix="/api/library", tags=["Tracks"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["Uploads"])
app.include_router(handlers.router, prefix="/ws/rooms", tags=["WebSockets"])

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to JamRoom API"}
