class PlaybackState:
    def __init__(self):
        self.track_id = None
        self.status = "paused" # playing or paused
        self.position = 0.0
        self.server_time = 0.0

class RoomState:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.playback = PlaybackState()
        self.connections: list = []

class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, RoomState] = {}

    def get_room(self, room_id: str) -> RoomState:
        if room_id not in self.rooms:
            self.rooms[room_id] = RoomState(room_id)
        return self.rooms[room_id]

    async def connect(self, room_id: str, websocket):
        await websocket.accept()
        room = self.get_room(room_id)
        room.connections.append(websocket)
        return room

    def disconnect(self, room_id: str, websocket):
        room = self.get_room(room_id)
        if websocket in room.connections:
            room.connections.remove(websocket)

    async def broadcast(self, room_id: str, message: dict, exclude=None):
        room = self.get_room(room_id)
        for connection in room.connections:
            if connection != exclude:
                await connection.send_json(message)

manager = ConnectionManager()
