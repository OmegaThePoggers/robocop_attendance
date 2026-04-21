import numpy as np
from typing import List


class EmbeddingGenerator:
    """
    ArcFace embedding extractor.

    Does NOT create its own FaceAnalysis instance (that caused the AssertionError
    because FaceAnalysis always requires a detection model).

    Instead it receives a reference to the shared FaceAnalysis instance that the
    FaceDetector already loaded (which includes both detection + recognition),
    and reads the normed_embedding that InsightFace computes on each face object.

    For the aligned-crop path (FIX 5), it accesses the recognition model
    from the shared app's model registry.
    """

    def __init__(self, app=None):
        """
        :param app: optional shared insightface.app.FaceAnalysis instance.
                    If None, embeddings can only be generated from face.normed_embedding.
        """
        self._app = app  # set by pipeline after FaceDetector initializes it

    def _normalize(self, embedding: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(embedding)
        return (embedding / norm).astype(np.float32) if norm > 0 else embedding.astype(np.float32)

    def generate_embedding(self, face) -> np.ndarray:
        """Generate L2-normalised 512-dim embedding from a raw InsightFace face object."""
        return self._normalize(np.array(face.normed_embedding))

    def generate_from_crop(self, aligned_crop: np.ndarray) -> np.ndarray:
        """
        FIX 5: Generate embedding from a pre-aligned 112x112 BGR crop
        using the recognition model from the shared FaceAnalysis app.
        """
        if self._app is None:
            raise RuntimeError("Shared FaceAnalysis app not set — call set_app() first")
        rec_model = self._app.models.get("recognition")
        if rec_model is None:
            raise RuntimeError("Recognition model not loaded in shared FaceAnalysis app")
        embedding = rec_model.get_feat(aligned_crop)
        return self._normalize(np.array(embedding).flatten())

    def set_app(self, app) -> None:
        """Inject the shared FaceAnalysis app after construction."""
        self._app = app

    def generate_batch(self, faces: list) -> List[np.ndarray]:
        return [self.generate_embedding(f) for f in faces]

    def generate_batch_from_crops(self, aligned_crops: List[np.ndarray]) -> List[np.ndarray]:
        return [self.generate_from_crop(crop) for crop in aligned_crops]
