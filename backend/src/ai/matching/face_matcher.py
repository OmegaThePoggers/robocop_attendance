"""
FaceMatcher — Dual-layer vector search
=======================================
Primary  : FAISS in-memory index (< 2 ms for hundreds of embeddings)
Fallback : pgvector cosine-distance query (always available, persistent)

Matching workflow per face:
  1. Attempt FAISS search on the per-class cached index.
  2. If FAISS index is empty (no enrolled faces) fall back to pgvector.
  3. Return (student_id, cosine_similarity).
"""
from __future__ import annotations

import logging
import time
from typing import Optional, Tuple

import numpy as np
from sqlalchemy import text
from sqlmodel import Session


logger = logging.getLogger(__name__)

FACE_CONFIDENCE_CONFIRMED = 0.38   # Lowered from 0.60 — group photo domain gap
FACE_CONFIDENCE_UNCERTAIN = 0.25   # Lowered from 0.45


class FaceMatcher:
    """Matches a query embedding against enrolled student faces for a class."""

    # ------------------------------------------------------------------
    # Primary: FAISS in-memory search
    # ------------------------------------------------------------------

    def _faiss_search(
        self,
        db: Session,
        embedding: np.ndarray,
        class_id: str,
    ) -> Tuple[Optional[str], float]:
        """
        Build (or retrieve cached) per-class FAISS index and perform
        nearest-neighbour cosine search.
        Returns (student_id, similarity) or (None, 0.0) if index is empty.
        """
        from src.ai.vector_index.embedding_cache import get_faiss_index

        t0 = time.perf_counter()
        index = get_faiss_index(class_id, db)
        if index.size() == 0:
            return None, 0.0

        results = index.search(embedding, k=3)  # get top 3 for debug
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"[MATCHER] FAISS search: {elapsed_ms:.2f}ms, class={class_id}, index_size={index.size()}")

        if not results:
            print(f"[MATCHER] FAISS returned no results")
            return None, 0.0
        
        # Log top matches for debugging
        for i, (sid, sim) in enumerate(results):
            print(f"[MATCHER]   #{i+1}: {sid} → similarity={sim:.4f}")
        
        student_id, similarity = results[0]
        return student_id, similarity

    # ------------------------------------------------------------------
    # Fallback: pgvector cosine search
    # ------------------------------------------------------------------

    def _pgvector_search(
        self,
        db: Session,
        embedding: np.ndarray,
        class_id: str,
    ) -> Tuple[Optional[str], float]:
        """
        pgvector cosine-distance search scoped to students enrolled in class_id.
        When class_id is "ALL", searches all students regardless of class.
        Similarity = 1 − cosine_distance  (higher is better, range [−1, 1]).
        """
        embedding_str = str(embedding.tolist())

        t0 = time.perf_counter()
        if class_id == "ALL":
            result = db.execute(
                text(
                    """
                    SELECT sf.student_id,
                           1 - (sf.embedding <=> CAST(:emb AS vector)) AS similarity
                    FROM studentface sf
                    ORDER BY sf.embedding <=> CAST(:emb AS vector)
                    LIMIT 1
                    """
                ),
                {"emb": embedding_str},
            )
        else:
            result = db.execute(
                text(
                    """
                    SELECT sf.student_id,
                           1 - (sf.embedding <=> CAST(:emb AS vector)) AS similarity
                    FROM studentface sf
                    INNER JOIN "user" u ON u.username = sf.student_id
                    WHERE u.class_id = :class_id AND u.role = 'student'
                    ORDER BY sf.embedding <=> CAST(:emb AS vector)
                    LIMIT 1
                    """
                ),
                {"emb": embedding_str, "class_id": class_id},
            )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"[MATCHER] pgvector search: {elapsed_ms:.2f}ms, class={class_id}")

        row = result.fetchone()
        if row is None:
            print(f"[MATCHER] pgvector returned no results")
            return None, 0.0
        student_id, similarity = row
        print(f"[MATCHER] pgvector best: {student_id} → similarity={float(similarity):.4f}")
        return student_id, float(similarity)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def find_best_match(
        self,
        db: Session,
        embedding: np.ndarray,
        class_id: str,
    ) -> Tuple[Optional[str], float]:
        """
        Try FAISS first; fall back to pgvector if FAISS has no data.

        Returns (student_id | None, cosine_similarity ∈ [−1, 1]).
        """
        student_id, similarity = self._faiss_search(db, embedding, class_id)

        if student_id is None:
            print(f"[MATCHER] FAISS empty for class={class_id}, falling back to pgvector")
            student_id, similarity = self._pgvector_search(db, embedding, class_id)

        return student_id, similarity

    def classify(self, confidence: float) -> str:
        if confidence >= FACE_CONFIDENCE_CONFIRMED:
            return "confirmed"
        if confidence >= FACE_CONFIDENCE_UNCERTAIN:
            return "uncertain"
        return "no_match"
