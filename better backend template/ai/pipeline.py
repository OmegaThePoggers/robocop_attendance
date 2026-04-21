import cv2
import numpy as np
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from ai.detection.face_detector import FaceDetector
from ai.embedding.embedding_generator import EmbeddingGenerator
from ai.matching.face_matcher import FaceMatcher


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

    async def process_image(
        self,
        image_bytes: bytes,
        class_id: str,
        db: AsyncSession,
    ) -> List[Dict[str, Any]]:
        """
        Process a classroom image and return a list of recognition results.
        Each result: {student_id, confidence, status, bbox}
        """
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image bytes")

        # FIX 5: detect_and_align gives explicit 112x112 landmark-aligned crops
        aligned_crops, raw_faces, _ = self.detector.detect_and_align(image)

        if not raw_faces:
            return []

        # Generate embeddings from aligned crops
        embeddings = self.embedder.generate_batch_from_crops(aligned_crops)

        results: List[Dict[str, Any]] = []
        for face, embedding in zip(raw_faces, embeddings):
            student_id, confidence = await self.matcher.find_best_match(db, embedding, class_id)
            rec_status = self.matcher.classify(confidence)
            results.append(
                {
                    "student_id": student_id,
                    "confidence": confidence,
                    "status": rec_status,
                    "bbox": face.bbox.tolist(),
                }
            )

        return results

    async def process_cropped_region(
        self,
        image_bytes: bytes,
        bbox_x: int,
        bbox_y: int,
        bbox_w: int,
        bbox_h: int,
        class_id: str,
        db: AsyncSession,
    ) -> List[Dict[str, Any]]:
        """
        Crop a specific region from the image then run recognition.
        Used by the dispute verification workflow.
        """
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        cropped = image[bbox_y: bbox_y + bbox_h, bbox_x: bbox_x + bbox_w]
        _, cropped_bytes = cv2.imencode(".jpg", cropped)
        return await self.process_image(cropped_bytes.tobytes(), class_id, db)


# Singleton — loaded once on worker/api startup
pipeline = FaceRecognitionPipeline()
