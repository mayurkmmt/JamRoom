# JamRoom 🎵

JamRoom is a real-time collaborative music player and broadcasting platform. It allows users to create rooms, join together, and listen to synchronized audio. Whether you are playing local files, extracting streams from YouTube or SoundCloud, or broadcasting live system audio over WebRTC—JamRoom keeps everyone in the room perfectly in sync.

## ✨ Features
- **Real-Time Synchronization**: Audio playback stays in sync across all clients in a room.
- **WebRTC Live Audio**: Broadcast your live system/mic audio to all participants with low latency.
- **Local File Uploads**: Upload and share local audio files securely.
- **Mobile-First Responsive UI**: Beautifully designed Next.js interface with album art presentation and built-in chat.
- **Robust State Management**: Built on top of Next.js and FastAPI to eliminate race conditions and keep room state unified.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Python, FastAPI, WebSockets (`python-multipart`, `pydantic-settings`)
- **Package Management**: `npm` (Frontend), `uv` (Backend)
- **Media**: WebRTC, HTML5 Audio, `yt-dlp`

---

## 🚀 Getting Started

Follow the instructions below to set up and run the frontend and backend servers locally.

### 1. Backend Setup (FastAPI)

The backend handles the WebSockets, room state coordination, API endpoints, and media resolution using Python. It uses `uv` for extremely fast dependency management.

```bash
# Navigate to the backend directory
cd backend

# Ensure you have 'uv' installed globally
# (If not, run: curl -LsSf https://astral.sh/uv/install.sh | sh)

# Install dependencies and sync the environment
uv sync

# Run the development server
uv run uvicorn main:app --reload
# OR if using FastAPI CLI
uv run fastapi dev
```

*The backend will typically run on `http://localhost:8000`.*

### 2. Frontend Setup (Next.js)

The frontend is a Next.js application tailored for mobile and desktop browsers alike.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies using npm (or yarn/pnpm)
npm install

# Start the Next.js development server
npm run dev
```

*The frontend will typically run on `http://localhost:3000`.*

---

## 🏗️ Architecture Notes
- **WebRTC Handshake**: Handled via WebSockets on the backend to coordinate SDP offers/answers between hosts and listeners. 
- **Audio Routing**: The frontend safely negotiates browser autoplay policies while maintaining continuous connections to avoid drop-offs.
- **Duplicate Prevention**: The UI implements guards to avoid double-joining rooms or firing simultaneous media creation events.