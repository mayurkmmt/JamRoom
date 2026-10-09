import os
import shutil
import re
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

UPLOAD_DIR = "uploads"

# Ensure the base upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{room_code}")
async def upload_track(room_code: str, file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    room_code = room_code.upper()
    room_upload_dir = os.path.join(UPLOAD_DIR, room_code)
    
    # Create the room-specific directory
    os.makedirs(room_upload_dir, exist_ok=True)
    
    # Clean the filename to prevent Next.js proxy double-encoding bugs
    original_name = file.filename or "uploaded_track.mp3"
    filename = re.sub(r'[^\w\.-]', '_', original_name)
    filename = re.sub(r'_+', '_', filename)
    
    file_path = os.path.join(room_upload_dir, filename)
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Generate the URL (e.g. /uploads/ROOMCODE/filename.mp3)
    file_url = f"/uploads/{room_code}/{filename}"
    
    return {"url": file_url, "filename": filename, "status": "success"}
