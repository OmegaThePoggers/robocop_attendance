import cv2
import numpy as np
from typing import List, Dict, Any

from sqlmodel import Session

from src.ai.detection.face_detector import FaceDetector
from src.ai.embedding.embedding_generator import EmbeddingGenerator
from src.ai.matching.face_matcher import FaceMatcher


class FaceRecognitionPipeline:
    """
    Full pipeline with explicit alignment step (FIX 5):
      bytes → resize → SCRFD detect → filter <80px
            → 5-point landmark alignment (norm_crop 112x112)
            → ArcFace embed → pgvector cosine match → threshold classify

    Single FaceAnalysis instance is shared between FaceDetector and EmbeddingGenerator
    to avoid the InsightFace assertion error (FaceAnalysis requires detection model).
    """

    def __init__(self):
        self.detector = FaceDetector()
        self.embedder = EmbeddingGenerator()
        # Share the FaceAnalysis app so embedder can access the recognition model
        self.embedder.set_app(self.detector.app)
        self.matcher = FaceMatcher()

    def process_image(
        self,
        image_bytes: bytes,
        class_id: str,
        db: Session,
    ) -> List[Dict[str, Any]]:
        """
        Process a classroom image and return a list of recognition results.
        Each result: {name, distance, bounding_box} matching the old schema.
        """
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            print("[PIPELINE] Error: Could not decode image bytes.")
            raise ValueError("Could not decode image bytes")

        print(f"[PIPELINE] Decoded image of shape {image.shape}. Running detect_and_align...")
        # detect_and_align gives explicit 112x112 landmark-aligned crops.
        # Use a smaller min_face_size (e.g. 30) for uploaded photos to catch people further back
        aligned_crops, raw_faces, _ = self.detector.detect_and_align(image, min_face_size=30)

        if not raw_faces:
            print("[PIPELINE] detect_and_align returned 0 faces.")
            return []

        print(f"[PIPELINE] Detected {len(raw_faces)} faces. Generating embeddings...")
        # Generate embeddings from aligned crops
        embeddings = self.embedder.generate_batch_from_crops(aligned_crops)
        print(f"[PIPELINE] Generated {len(embeddings)} embeddings.")

        results: List[Dict[str, Any]] = []
        for face, embedding in zip(raw_faces, embeddings):
            student_id, similarity = self.matcher.find_best_match(db, embedding, class_id)
            rec_status = self.matcher.classify(similarity)
            
            name = student_id if (student_id and rec_status == "confirmed") else "Unknown"
            distance = 1.0 - similarity # convert similarity to distance for backward compatibility
            
            print(f"[PIPELINE] Face matched as {name} with distance {distance:.3f} (sim: {similarity:.3f}, status: {rec_status})")
            
            # SCRFD bbox is [left, top, right, bottom] -> [x1, y1, x2, y2]
            # Old schema wanted [top, right, bottom, left]
            l, t, r, b = map(int, face.bbox)

            results.append(
                {
                    "name": name,
                    "distance": float(distance),
                    "bounding_box": [t, r, b, l],
                }
            )

        return results

    def process_cropped_region(
        self,
        image_bytes: bytes,
        bbox_x: int,
        bbox_y: int,
        bbox_w: int,
        bbox_h: int,
        class_id: str,
        db: Session,
    ) -> List[Dict[str, Any]]:
        """
        Crop a specific region from the image then run recognition.
        Used by the dispute verification workflow.
        """
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        cropped = image[bbox_y: bbox_y + bbox_h, bbox_x: bbox_x + bbox_w]
        _, cropped_bytes = cv2.imencode(".jpg", cropped)
        return self.process_image(cropped_bytes.tobytes(), class_id, db)


# Singleton — loaded once on worker/api startup
pipeline = FaceRecognitionPipeline()
