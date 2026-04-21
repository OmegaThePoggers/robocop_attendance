from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from typing import Optional, List, Dict
import shutil
import uuid
import os
import logging
import cv2
import numpy as np
from datetime import datetime

from ..dependencies import (
    allow_teacher_admin,
    get_attendance_service,
    get_recognition_service,
    get_recognition_service,
    get_video_processor,
    get_session,
)
from sqlmodel import Session
from ..models import User, AttendanceSession
from ..schemas import RecognitionResponse, DetectFacesResponse, FaceResult, BoundingBox
from ..attendance import AttendanceService
from ..recognition import RecognitionService
from ..video_processor import VideoProcessor

logger = logging.getLogger(__name__)
router = APIRouter(tags=["recognition"])


@router.post("/recognize/image", response_model=RecognitionResponse)
async def recognize_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin),
    rec_svc: RecognitionService = Depends(get_recognition_service),
    att_svc: AttendanceService = Depends(get_attendance_service),
    db: Session = Depends(get_session),
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning("Decoding image resulted in None for file '%s'", file.filename)
            raise HTTPException(status_code=400, detail="Invalid image file")

        class_id_str = "ALL"
        if session_id:
            att_session = db.get(AttendanceSession, session_id)
            if att_session and att_session.class_id:
                class_id_str = str(att_session.class_id)

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = rec_svc.recognize_image(rgb_img, class_id=class_id_str, db=db)

        # Save image as AttendanceSource if there's a session
        source_id = None
        file_path = None
        if session_id and results:
            session_dir = f"static/sessions/{session_id}"
            os.makedirs(session_dir, exist_ok=True)
            filename = f"frame_{uuid.uuid4()}.jpg"
            file_path = os.path.join(session_dir, filename)
            cv2.imwrite(file_path, img)

            db_path = f"sessions/{session_id}/{filename}"
            source_record = att_svc.add_attendance_source(session_id, db_path, "image")
            source_id = source_record.id
            file_path = db_path

        # Process results
        for res in results:
            name = res["name"]
            if session_id:
                if name != "Unknown":
                    metadata: Dict = {"source": "live_camera"}
                    if source_id:
                        metadata["source_id"] = source_id
                        metadata["file_path"] = file_path
                        metadata["bounding_box"] = res["bounding_box"]
                    att_svc.mark_attendance(
                        name, 1.0 - res["distance"], session_id, metadata=metadata
                    )
                else:
                    unknown_filename = f"unknown_{uuid.uuid4()}.jpg"
                    unknown_filepath = os.path.join("static/unknowns", unknown_filename)
                    
                    # Crop the face from the original image using the bounding box
                    try:
                        # res["bounding_box"] is [top, right, bottom, left]
                        y_top, x_right, y_bottom, x_left = map(int, res["bounding_box"])
                        x1, y1, x2, y2 = x_left, y_top, x_right, y_bottom
                        
                        # Add 20% margin
                        h, w = y2 - y1, x2 - x1
                        margin_y, margin_x = int(h * 0.2), int(w * 0.2)
                        
                        # Apply bounds checking
                        img_h, img_w = img.shape[:2]
                        cx1 = max(0, x1 - margin_x)
                        cy1 = max(0, y1 - margin_y)
                        cx2 = min(img_w, x2 + margin_x)
                        cy2 = min(img_h, y2 + margin_y)
                        
                        face_crop = img[cy1:cy2, cx1:cx2]
                        
                        # Fallback to original if crop is somehow invalid
                        if face_crop.size == 0:
                            face_crop = img
                    except Exception as e:
                        logger.warning("Failed to crop unknown face: %s", e)
                        face_crop = img

                    cv2.imwrite(unknown_filepath, face_crop)
                    att_svc.register_unknown(
                        session_id, f"unknowns/{unknown_filename}", 1.0 - res["distance"]
                    )
                    logger.debug("Registered Unknown Face (distance: %s)", res['distance'])

        logger.debug("Processed /recognize/image with %d faces", len(results))
        return RecognitionResponse(
            faces=[FaceResult(**r) for r in results]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in recognize_image: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-faces", response_model=DetectFacesResponse)
async def detect_faces_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(allow_teacher_admin),
    rec_svc: RecognitionService = Depends(get_recognition_service),
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    locations = rec_svc.detect_only(rgb_img)
    return DetectFacesResponse(
        faces=[BoundingBox(bounding_box=list(loc)) for loc in locations]
    )


@router.post("/recognize/video")
async def recognize_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin),
    vid_svc: VideoProcessor = Depends(get_video_processor),
    att_svc: AttendanceService = Depends(get_attendance_service),
    db: Session = Depends(get_session),
):
    temp_file = f"temp_{uuid.uuid4()}.mp4"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        class_id_str = "ALL"
        if session_id:
            att_session = db.get(AttendanceSession, session_id)
            if att_session and att_session.class_id:
                class_id_str = str(att_session.class_id)

        results = vid_svc.process_video(temp_file, class_id=class_id_str, db=db)

        if session_id:
            for name in results["identities"]:
                if name != "Unknown":
                    att_svc.mark_attendance(
                        name, 1.0, session_id, metadata={"source": "video_upload"}
                    )

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
