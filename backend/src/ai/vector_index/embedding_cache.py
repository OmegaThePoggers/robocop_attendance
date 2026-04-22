"""
Embedding Cache Module
======================
Manages per-class FAISS indices.

Lifecycle:
  1. On startup   → load_all_active_classes() prebuilds indices for all classes
                    that have enrolled students.
  2. On request   → get_faiss_index(class_id) returns the cached index (or builds
                    it on first access per class).
  3. On new enroll → invalidate(class_id) drops the stale index so the next
                     request triggers a fresh rebuild.

Thread safety:
  A per-class asyncio.Lock prevents duplicate rebuilds under concurrent requests.
"""
from __future__ import annotations

import logging
import urllib.parse
from typing import Dict, Optional
import threading

import numpy as np
from sqlmodel import Session, select
from sqlalchemy import text

from src.ai.vector_index.faiss_index import FaissIndex

logger = logging.getLogger(__name__)

# Global registry  class_id → FaissIndex
_cache: Dict[str, FaissIndex] = {}
# Per-class build lock (prevents simultaneous rebuilds for the same class)
_locks: Dict[str, threading.Lock] = {}


def _get_lock(class_id: str) -> threading.Lock:
    if class_id not in _locks:
        _locks[class_id] = threading.Lock()
    return _locks[class_id]


def load_class_embeddings(class_id: str, db: Session) -> list[tuple[str, np.ndarray]]:
    """
    Fetch all (student_id, embedding) pairs for students enrolled in class_id
    from student_faces in PostgreSQL.
    When class_id is "ALL", returns embeddings for ALL students regardless of class.
    Returns a list of (student_id, embedding_array) tuples.
    """
    if class_id == "ALL":
        query = text(
            """
            SELECT sf.student_id, sf.embedding::text
            FROM studentface sf
            WHERE sf.embedding IS NOT NULL
            """
        )
        rows = db.execute(query)
    else:
        query = text(
            """
            SELECT sf.student_id, sf.embedding::text
            FROM studentface sf
            INNER JOIN "user" u ON u.username = sf.student_id
            WHERE u.class_id = :class_id
              AND sf.embedding IS NOT NULL
            """
        )
        rows = db.execute(query, {"class_id": class_id})

    result = []
    for row in rows.fetchall():
        student_id, emb_text = row
        try:
            # pgvector returns embedding as "[0.1,0.2,...]"
            emb = np.array(
                [float(x) for x in emb_text.strip("[]").split(",")],
                dtype=np.float32,
            )
            result.append((student_id, emb))
        except Exception as e:
            logger.warning("Could not parse embedding for student %s: %s", student_id, e)
    return result


def build_faiss_index(class_id: str, db: Session) -> FaissIndex:
    """Build a fresh FaissIndex from PostgreSQL data for the given class."""
    pairs = load_class_embeddings(class_id, db)
    index = FaissIndex()
    if pairs:
        student_ids = [p[0] for p in pairs]
        embeddings = [p[1] for p in pairs]
        index.add_embeddings(student_ids, embeddings)
        index.rebuild_for_large_dataset()
        logger.info(
            "Built FAISS index for class %s: %d embeddings", class_id, index.size()
        )
    else:
        logger.info("No embeddings found for class %s — empty FAISS index", class_id)
    return index


def get_faiss_index(class_id: str, db: Session) -> FaissIndex:
    """
    Return the cached FAISS index for class_id, building it if necessary.
    Thread-safe: uses a per-class lock to prevent duplicate builds.
    """
    if class_id in _cache:
        return _cache[class_id]

    with _get_lock(class_id):
        # Double-check after acquiring lock
        if class_id in _cache:
            return _cache[class_id]
        _cache[class_id] = build_faiss_index(class_id, db)
    return _cache[class_id]


def invalidate(class_id: str) -> None:
    """
    Drop the cached index for class_id.
    The next call to get_faiss_index() will rebuild from PostgreSQL.
    Call this whenever a new face is enrolled for a student in this class.
    """
    dropped = _cache.pop(class_id, None)
    if dropped is not None:
        logger.info("FAISS cache invalidated for class %s", class_id)


def invalidate_all() -> None:
    """Drop all cached indices. Useful on worker restart."""
    _cache.clear()
    logger.info("FAISS cache fully invalidated")


def load_all_active_classes(db: Session) -> None:
    """
    Startup optimisation: preload FAISS indices for all classes that have
    at least one enrolled face so the first recognition request is fast.
    Always preloads the "ALL" index for sessions without class scope.
    """
    # Always preload the global index
    try:
        get_faiss_index("ALL", db)
    except Exception as e:
        logger.error("FAISS startup: failed to build ALL index: %s", e)

    rows = db.execute(
        text(
            """
            SELECT DISTINCT u.class_id
            FROM "user" u
            INNER JOIN studentface sf ON sf.student_id = u.username
            WHERE sf.embedding IS NOT NULL AND u.class_id IS NOT NULL
            """
        )
    )
    class_ids = [str(r[0]) for r in rows.fetchall()]
    if not class_ids:
        logger.info("FAISS startup: no class-specific indices to preload")
        return

    logger.info("FAISS startup: preloading indices for %d class(es)", len(class_ids))
    for cid in class_ids:
        try:
            get_faiss_index(cid, db)
        except Exception as e:
            logger.error("FAISS startup: failed to build index for class %s: %s", cid, e)
