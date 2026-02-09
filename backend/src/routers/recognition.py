from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from typing import Optional
import shutil
import uuid
import os
import cv2
import numpy as np
from datetime import datetime

from .. import dependencies
from ..dependencies import attendance_service, allow_teacher_admin
from ..models import User

router = APIRouter(tags=["recognition"])

@router.post("/recognize/image")
async def recognize_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin)
):
    if not dependencies.recognition_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    try:
        start_time = datetime.utcnow()
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
             raise HTTPException(status_code=400, detail="Invalid image file")

        # Convert to RGB for face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Recognize
        results = dependencies.recognition_service.recognize_image(rgb_img)
        
        # Process results
        for res in results:
            name = res['name']
            if session_id:
                if name != "Unknown":
                    # Mark attendance
                    if attendance_service:
                        attendance_service.mark_attendance(
                            name, 
                            1.0 - res['distance'], 
                            session_id,
                            metadata={"source": "live_camera"}
                        )
                else:
                    # Register Unknown
                    # Save image to static/unknowns
                    if attendance_service:
                         # Generate filename
                         filename = f"unknown_{uuid.uuid4()}.jpg"
                         filepath = os.path.join("static/unknowns", filename)
                         cv2.imwrite(filepath, img) # Save original BGR
                         attendance_service.register_unknown(session_id, f"unknowns/{filename}", 1.0 - res['distance'])
        
        return {"faces": results}
    except Exception as e:
        print(f"Error in recognize_image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-faces")
async def detect_faces_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(allow_teacher_admin)
):
    if not dependencies.recognition_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    locations = dependencies.recognition_service.detect_only(rgb_img)
    # Format: [top, right, bottom, left]
    return {"faces": [{"bounding_box": loc} for loc in locations]}

@router.post("/recognize/video")
async def recognize_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin)
):
    if not dependencies.video_processor:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    # Save temp file
    temp_file = f"temp_{uuid.uuid4()}.mp4"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        results = dependencies.video_processor.process_video(temp_file)
        
        # Mark attendance for verified identities
        if session_id and attendance_service:
            for name in results["identities"]:
                 if name != "Unknown":
                     attendance_service.mark_attendance(name, 1.0, session_id, metadata={"source": "video_upload"})
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
