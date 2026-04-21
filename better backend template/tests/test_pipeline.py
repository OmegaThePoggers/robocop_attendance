"""
Benchmark: FAISS vs pgvector search latency
============================================
Run with:
    pytest tests/test_pipeline.py -v -s

Generates a synthetic dataset of N embeddings, inserts them into a FaissIndex,
and measures search latency — then compares against a pgvector estimate.

Note: pgvector timing is simulated via a local round-trip estimate because the
full DB stack is not guaranteed to be available during unit tests.
For real pgvector timings use the integration test environment.
"""
from __future__ import annotations

import time

import numpy as np
import pytest

from ai.vector_index.faiss_index import FaissIndex, _l2_norm


# ── helpers ─────────────────────────────────────────────────────────────────

def _random_embeddings(n: int, dim: int = 512, seed: int = 42):
    rng = np.random.default_rng(seed)
    embs = rng.standard_normal((n, dim)).astype(np.float32)
    return [_l2_norm(e) for e in embs]


def _build_index(n: int) -> tuple[FaissIndex, list[str], list[np.ndarray]]:
    embeddings = _random_embeddings(n)
    student_ids = [f"s{i:04d}" for i in range(n)]
    idx = FaissIndex()
    idx.add_embeddings(student_ids, embeddings)
    return idx, student_ids, embeddings


# ── tests ────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("n", [10, 100, 500, 1000])
def test_faiss_search_latency(n: int):
    """FAISS search should complete in < 2 ms for up to 1 000 embeddings."""
    idx, _, embeddings = _build_index(n)
    query = _l2_norm(_random_embeddings(1)[0])

    # Warm up
    idx.search(query, k=1)

    # Measure (average over 50 queries)
    runs = 50
    t0 = time.perf_counter()
    for _ in range(runs):
        idx.search(query, k=1)
    elapsed_ms = (time.perf_counter() - t0) / runs * 1000

    print(f"\n  FAISS search ({n} vectors): {elapsed_ms:.2f} ms per query")
    assert elapsed_ms < 2.0, f"FAISS too slow: {elapsed_ms:.2f} ms for {n} vectors"


def test_faiss_returns_correct_match():
    """Searching for an enrolled embedding should return that student."""
    idx, student_ids, embeddings = _build_index(50)
    target_idx = 7
    query = embeddings[target_idx]  # Already normalised

    results = idx.search(query, k=1)
    assert results, "Expected at least one result"
    best_id, score = results[0]
    assert best_id == student_ids[target_idx], f"Expected {student_ids[target_idx]}, got {best_id}"
    assert score > 0.99, f"Expected near-perfect cosine sim, got {score:.4f}"


def test_faiss_empty_index_returns_empty():
    """Searching an empty index should return []."""
    idx = FaissIndex()
    results = idx.search(np.random.randn(512).astype(np.float32), k=1)
    assert results == []


def test_faiss_invalidation():
    """Clearing an index means subsequent searches return nothing."""
    idx, _, embeddings = _build_index(20)
    idx.clear()
    results = idx.search(_l2_norm(embeddings[0]), k=1)
    assert results == []


def test_faiss_vs_pgvector_benchmark(capsys):
    """
    Simulated comparison benchmark.
    FAISS measures real latency; pgvector latency is a realistic estimate
    based on a local asyncpg + pgvector round-trip on a single machine (~5–10 ms).
    """
    PGVECTOR_ESTIMATE_MS = 7.0  # typical single-machine latency

    idx, _, embeddings = _build_index(200)
    query = _l2_norm(_random_embeddings(1)[0])

    runs = 100
    t0 = time.perf_counter()
    for _ in range(runs):
        idx.search(query, k=1)
    faiss_ms = (time.perf_counter() - t0) / runs * 1000

    with capsys.disabled():
        print(f"\n{'─'*40}")
        print(f"  FAISS search (200 vectors) : {faiss_ms:.2f} ms")
        print(f"  pgvector search (estimate) : {PGVECTOR_ESTIMATE_MS:.1f} ms")
        speedup = PGVECTOR_ESTIMATE_MS / faiss_ms if faiss_ms > 0 else float("inf")
        print(f"  Speedup                    : {speedup:.1f}×")
        print(f"{'─'*40}")

    # FAISS must be faster than the pgvector baseline
    assert faiss_ms < PGVECTOR_ESTIMATE_MS, (
        f"FAISS ({faiss_ms:.2f} ms) should beat pgvector estimate ({PGVECTOR_ESTIMATE_MS} ms)"
    )
