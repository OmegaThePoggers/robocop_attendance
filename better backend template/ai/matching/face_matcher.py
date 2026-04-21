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
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings

logger = logging.getLogger(__name__)


class FaceMatcher:
    """Matches a query embedding against enrolled student faces for a class."""

    # ------------------------------------------------------------------
    # Primary: FAISS in-memory search
    # ------------------------------------------------------------------

    async def _faiss_search(
        self,
        db: AsyncSession,
        embedding: np.ndarray,
        class_id: str,
    ) -> Tuple[Optional[str], float]:
        """
        Build (or retrieve cached) per-class FAISS index and perform
        nearest-neighbour cosine search.
        Returns (student_id, similarity) or (None, 0.0) if index is empty.
        """
        from ai.vector_index.embedding_cache import get_faiss_index

        t0 = time.perf_counter()
        index = await get_faiss_index(class_id, db)
        if index.size() == 0:
            return None, 0.0

        results = index.search(embedding, k=1)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.debug("FAISS search: %.2f ms (class=%s)", elapsed_ms, class_id)

        if not results:
            return None, 0.0
        student_id, similarity = results[0]
        return student_id, similarity

    # ------------------------------------------------------------------
    # Fallback: pgvector cosine search
    # ------------------------------------------------------------------

    async def _pgvector_search(
        self,
        db: AsyncSession,
        embedding: np.ndarray,
        class_id: str,
    ) -> Tuple[Optional[str], float]:
        """
        pgvector cosine-distance search scoped to students enrolled in class_id.
        Similarity = 1 − cosine_distance  (higher is better, range [−1, 1]).
        """
        embedding_str = str(embedding.tolist())

        t0 = time.perf_counter()
        result = await db.execute(
            text(
                """
                SELECT sf.student_id,
                       1 - (sf.embedding <=> CAST(:emb AS vector)) AS similarity
                FROM student_faces sf
                INNER JOIN class_students cs ON cs.student_id = sf.student_id
                WHERE cs.class_id = :class_id
                ORDER BY sf.embedding <=> CAST(:emb AS vector)
                LIMIT 1
                """
            ),
            {"emb": embedding_str, "class_id": class_id},
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.debug("pgvector search: %.2f ms (class=%s)", elapsed_ms, class_id)

        row = result.fetchone()
        if row is None:
            return None, 0.0
        student_id, similarity = row
        return student_id, float(similarity)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def find_best_match(
        self,
        db: AsyncSession,
        embedding: np.ndarray,
        class_id: str,
    ) -> Tuple[Optional[str], float]:
        """
        Try FAISS first; fall back to pgvector if FAISS has no data.

        Returns (student_id | None, cosine_similarity ∈ [−1, 1]).
        """
        student_id, similarity = await self._faiss_search(db, embedding, class_id)

        if student_id is None:
            # FAISS index empty — use pgvector as authoritative source
            logger.debug(
                "FAISS index empty for class %s — falling back to pgvector", class_id
            )
            student_id, similarity = await self._pgvector_search(db, embedding, class_id)

        return student_id, similarity

    def classify(self, confidence: float) -> str:
        if confidence >= settings.FACE_CONFIDENCE_CONFIRMED:
            return "confirmed"
        if confidence >= settings.FACE_CONFIDENCE_UNCERTAIN:
            return "uncertain"
        return "no_match"
