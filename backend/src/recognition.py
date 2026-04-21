import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from sqlmodel import Session
from .ai.pipeline import pipeline

class RecognitionService:
    def __init__(self, embedding_loader=None):
        # The embedding_loader parameter is kept for compatibility with main.py instantiation
        pass

    def detect_only(self, image_file) -> List[Tuple[int, int, int, int]]:
        """
        Detects faces and returns bounding boxes.
        Returns: List of (top, right, bottom, left) tuples.
        """
        image = image_file
        if not isinstance(image, np.ndarray):
            arr = np.frombuffer(image_file, np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # SCRFD expects BGR
        bgr_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        _, raw_faces, _ = pipeline.detector.detect_and_align(bgr_image)
        
        face_locations = []
        if raw_faces:
            for face in raw_faces:
                l, t, r, b = map(int, face.bbox)
                face_locations.append((t, r, b, l))

        return face_locations

    def recognize_image(self, image_file, class_id: str, db: Session, tolerance: float = 0.6) -> List[Dict]:
        """
        Detects faces in an image and matches them against known students.
        """
        image = image_file
        if not isinstance(image, np.ndarray):
            arr = np.frombuffer(image_file, np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
        bgr_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        _, img_encoded = cv2.imencode('.jpg', bgr_image)
        image_bytes = img_encoded.tobytes()

        return pipeline.process_image(image_bytes, class_id, db)
