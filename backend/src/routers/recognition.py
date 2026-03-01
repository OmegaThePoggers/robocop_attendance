from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from typing import Optional, List, Dict
import shutil
import uuid
import os
import cv2
import numpy as np
from datetime import datetime

from ..dependencies import (
    allow_teacher_admin,
    get_attendance_service,
    get_recognition_service,
    get_video_processor,
)
from ..models import User
from ..schemas import RecognitionResponse, DetectFacesResponse, FaceResult, BoundingBox
from ..attendance import AttendanceService
from ..recognition import RecognitionService
from ..video_processor import VideoProcessor

router = APIRouter(tags=["recognition"])


@router.post("/recognize/image", response_model=RecognitionResponse)
async def recognize_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(allow_teacher_admin),
    rec_svc: RecognitionService = Depends(get_recognition_service),
    att_svc: AttendanceService = Depends(get_attendance_service),
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = rec_svc.recognize_image(rgb_img)

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
                    cv2.imwrite(unknown_filepath, img)
                    att_svc.register_unknown(
                        session_id, f"unknowns/{unknown_filename}", 1.0 - res["distance"]
                    )

        return RecognitionResponse(
            faces=[FaceResult(**r) for r in results]
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in recognize_image: {e}")
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
):
    temp_file = f"temp_{uuid.uuid4()}.mp4"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        results = vid_svc.process_video(temp_file)

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
