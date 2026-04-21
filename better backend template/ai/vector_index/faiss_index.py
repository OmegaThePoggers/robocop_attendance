"""
FAISS Index Module
==================
Provides a fast in-memory cosine-similarity vector index backed by FAISS.

Design choices:
- IndexFlatIP  (inner-product)  → exact nearest-neighbour search on L2-normalised
  vectors is equivalent to cosine similarity.
- HNSW32 is used when the dataset is large (>500 vectors) for sub-linear search.
- Embeddings are L2-normalised before insertion so inner-product == cosine sim.
- A position→student_id mapping is kept alongside the FAISS index.
"""
from __future__ import annotations

import logging
import threading
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# Dimension of ArcFace buffalo_l embeddings
EMBEDDING_DIM = 512
# Switch to HNSW when index has more than this many vectors
HNSW_THRESHOLD = 500
HNSW_M = 32  # HNSW graph connectivity


def _build_flat_index():
    import faiss
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    return index


def _build_hnsw_index():
    import faiss
    index = faiss.IndexHNSWFlat(EMBEDDING_DIM, HNSW_M, faiss.METRIC_INNER_PRODUCT)
    index.hnsw.efSearch = 64
    return index


class FaissIndex:
    """
    Thread-safe FAISS index for a single cohort (e.g. one class).

    Usage:
        idx = FaissIndex()
        idx.add_embeddings(student_ids, embeddings)
        student_id, score = idx.search(query_embedding)
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._index = _build_flat_index()
        self._id_map: List[str] = []       # position → student_id

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_embeddings(self, student_ids: List[str], embeddings: List[np.ndarray]) -> None:
        """Add (student_id, embedding) pairs to the index."""
        if not student_ids:
            return
        normed = np.array([_l2_norm(e) for e in embeddings], dtype=np.float32)
        with self._lock:
            self._index.add(normed)
            self._id_map.extend(student_ids)
        logger.debug("FaissIndex: added %d vectors (total=%d)", len(student_ids), len(self._id_map))

    def search(
        self, query_embedding: np.ndarray, k: int = 1
    ) -> List[Tuple[str, float]]:
        """
        Return the k closest matches as [(student_id, cosine_similarity), ...].
        Returns empty list if the index is empty.
        """
        if len(self._id_map) == 0:
            return []

        q = _l2_norm(query_embedding).reshape(1, -1).astype(np.float32)
        with self._lock:
            effective_k = min(k, len(self._id_map))
            sims, indices = self._index.search(q, effective_k)

        results = []
        for sim, idx in zip(sims[0], indices[0]):
            if idx < 0:
                continue
            results.append((self._id_map[idx], float(sim)))
        return results

    def size(self) -> int:
        return len(self._id_map)

    def clear(self) -> None:
        with self._lock:
            self._index = _build_flat_index()
            self._id_map = []

    def rebuild_for_large_dataset(self) -> None:
        """Switch to HNSW when the index grows large enough."""
        if self.size() >= HNSW_THRESHOLD:
            logger.info("FaissIndex: switching to HNSW (size=%d)", self.size())
            # Copy vectors out, clear, rebuild with HNSW
            with self._lock:
                xb = np.zeros((len(self._id_map), EMBEDDING_DIM), dtype=np.float32)
                self._index.reconstruct_n(0, len(self._id_map), xb)
                self._index = _build_hnsw_index()
                self._index.add(xb)


# ------------------------------------------------------------------
# Helper
# ------------------------------------------------------------------

def _l2_norm(v: np.ndarray) -> np.ndarray:
    v = np.array(v, dtype=np.float32)
    norm = np.linalg.norm(v)
    return v / norm if norm > 0 else v
