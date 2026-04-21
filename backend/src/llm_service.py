"""
LLM Service — Groq (primary) with Gemini fallback for AI features.
Falls back to heuristic classification when no API key is configured.
"""
import os
import json
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Subject keyword map for heuristic fallback
SUBJECT_KEYWORDS = {
    "mathematics": ["calculus", "algebra", "matrix", "integral", "derivative", "equation", "theorem", "proof", "vector", "statistics", "probability", "geometry"],
    "physics": ["force", "velocity", "acceleration", "momentum", "energy", "wave", "quantum", "thermodynamics", "optics", "electric", "magnetic", "gravitation"],
    "chemistry": ["atom", "molecule", "reaction", "bond", "acid", "base", "organic", "inorganic", "periodic", "oxidation", "reduction", "enthalpy"],
    "computer science": ["algorithm", "data structure", "programming", "code", "complexity", "recursion", "sorting", "graph", "tree", "database", "network", "os"],
    "electronics": ["circuit", "transistor", "diode", "amplifier", "voltage", "current", "resistance", "capacitor", "inductor", "semiconductor", "logic gate"],
    "data structures": ["array", "linked list", "stack", "queue", "heap", "binary tree", "hash", "bst", "graph traversal", "dynamic programming"],
    "machine learning": ["neural network", "deep learning", "gradient descent", "overfitting", "regression", "classification", "clustering", "feature", "model"],
    "signals": ["fourier", "laplace", "convolution", "filter", "sampling", "modulation", "frequency", "spectrum"],
    "biology": ["cell", "dna", "rna", "protein", "enzyme", "genetics", "evolution", "photosynthesis", "metabolism"],
    "english": ["grammar", "essay", "literature", "sentence", "paragraph", "vocabulary", "comprehension", "writing"],
}


def _heuristic_classify(text: str) -> dict:
    """Simple keyword-based classification when no LLM is available."""
    text_lower = text.lower()
    best_subject = "General"
    best_score = 0

    for subject, keywords in SUBJECT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_subject = subject.title()

    confidence = min(0.5 + best_score * 0.1, 0.9) if best_score > 0 else 0.3
    return {"subject": best_subject, "confidence": round(confidence, 2)}


async def classify_doubt(text: str) -> dict:
    """
    Classify a doubt into a subject with confidence.
    Returns: {"subject": str, "confidence": float}
    """
    groq_key = os.getenv("GROQ_API_KEY")

    if not groq_key:
        return _heuristic_classify(text)

    try:
        import httpx
        prompt = f"""You are an academic doubt classifier. Given the student's question, identify the subject and confidence.

Student question: "{text}"

Respond with ONLY valid JSON in this exact format:
{{"subject": "Mathematics", "confidence": 0.92}}

Rules:
- subject must be one of: Mathematics, Physics, Chemistry, Computer Science, Electronics, Data Structures, Machine Learning, Signals & Systems, Biology, English, Other
- confidence is a float between 0.0 and 1.0
- No explanation, no markdown, just JSON"""

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 60,
                    "temperature": 0.1,
                },
            )
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                # Extract JSON even if wrapped in markdown
                match = re.search(r'\{.*\}', content, re.DOTALL)
                if match:
                    return json.loads(match.group())
    except Exception as e:
        logger.warning(f"Groq classify_doubt failed: {e}")

    return _heuristic_classify(text)


async def solve_doubt(text: str, subject: Optional[str] = None) -> str:
    """
    Generate a concise AI answer for a student doubt.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    subject_ctx = f" (Subject: {subject})" if subject else ""
    system_prompt = (
        "You are a helpful academic tutor. Answer the student's question concisely and accurately. "
        "Use simple language. Provide step-by-step explanation if it's a numerical problem. "
        "Keep the answer under 300 words."
    )
    user_prompt = f"Student question{subject_ctx}: {text}"

    # Try Groq first
    if groq_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "max_tokens": 500,
                        "temperature": 0.3,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.warning(f"Groq solve_doubt failed: {e}")

    # Try Gemini fallback
    if gemini_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
                    json={
                        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
                        "generationConfig": {"maxOutputTokens": 500, "temperature": 0.3},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.warning(f"Gemini solve_doubt failed: {e}")

    return "I'm unable to auto-solve this doubt right now. Your teacher will respond shortly."


async def ai_chat(messages: list) -> str:
    """
    Multi-turn AI chat (used for student-AI chat feature).
    messages: list of {"role": "user"|"assistant", "content": str}
    """
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    system = (
        "You are Cogni, a friendly academic AI assistant for university students. "
        "Help with studies, assignments, schedules, and academic queries. "
        "Be concise, encouraging, and accurate."
    )

    if groq_key:
        try:
            import httpx
            chat_messages = [{"role": "system", "content": system}] + messages
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama3-8b-8192",
                        "messages": chat_messages,
                        "max_tokens": 400,
                        "temperature": 0.5,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.warning(f"Groq ai_chat failed: {e}")

    if gemini_key:
        try:
            import httpx
            # Convert to Gemini format
            parts = [{"text": system + "\n\n"}]
            for m in messages:
                parts.append({"text": f"{m['role'].upper()}: {m['content']}\n"})
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
                    json={"contents": [{"parts": parts}], "generationConfig": {"maxOutputTokens": 400}},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.warning(f"Gemini ai_chat failed: {e}")

    return "AI assistant is currently unavailable. Please check back later."
