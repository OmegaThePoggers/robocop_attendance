import cv2
import numpy as np
from typing import Tuple, List

from core.config import settings


class FaceDetector:
    """
    Full FaceAnalysis (detection + recognition) loaded once.
    The shared app instance is exposed so EmbeddingGenerator can reuse it
    without creating a second FaceAnalysis (which would fail the detection assertion).
    """

    def __init__(self):
        from insightface.app import FaceAnalysis
        # Load both detection AND recognition so normed_embedding is populated
        # and EmbeddingGenerator can re-use the same app for its rec model.
        self._app = FaceAnalysis(
            name="buffalo_l",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        self._app.prepare(ctx_id=0, det_size=(640, 640))

    @property
    def app(self):
        """Expose the shared FaceAnalysis instance for EmbeddingGenerator."""
        return self._app

    def _resize(self, image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        if w > settings.MAX_IMAGE_WIDTH:
            scale = settings.MAX_IMAGE_WIDTH / w
            image = cv2.resize(
                image,
                (settings.MAX_IMAGE_WIDTH, int(h * scale)),
                interpolation=cv2.INTER_AREA,
            )
        return image

    def detect(self, image: np.ndarray) -> Tuple[list, np.ndarray]:
        """
        Returns (faces, resized_image).
        Faces smaller than MIN_FACE_SIZE_PX are discarded.
        Each face object carries .bbox, .kps (5 landmarks), .normed_embedding, .det_score.
        """
        image = self._resize(image)
        faces = self._app.get(image)
        faces = [f for f in faces if (f.bbox[3] - f.bbox[1]) >= settings.MIN_FACE_SIZE_PX]
        return faces, image

    def align_face(self, image: np.ndarray, face) -> np.ndarray:
        """
        FIX 5: Explicitly align a detected face using its 5 SCRFD landmarks.
        Returns a 112x112 normalised face crop ready for ArcFace embedding.
        """
        from insightface.utils import face_align
        return face_align.norm_crop(image, landmark=face.kps, image_size=112)

    def detect_and_align(self, image: np.ndarray) -> Tuple[List[np.ndarray], list, np.ndarray]:
        """
        Full detection + alignment pass.
        Returns (aligned_crops, raw_faces, resized_image).
        """
        faces, resized = self.detect(image)
        aligned = [self.align_face(resized, f) for f in faces]
        return aligned, faces, resized

    def detect_raw(self, image_bytes: bytes) -> Tuple[list, np.ndarray]:
        """Convenience: decode bytes then detect."""
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image bytes")
        return self.detect(image)

    def detect_faces_raw(self, image_bytes: bytes) -> list:
        """Alias used by the face-enrollment router."""
        faces, _ = self.detect_raw(image_bytes)
        return faces
