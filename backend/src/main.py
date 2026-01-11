from fastapi import FastAPI
from typing import Optional
from .embedding_loader import EmbeddingLoader

app = FastAPI()

embedding_loader: Optional[EmbeddingLoader] = None

@app.on_event("startup")
async def startup_event():
    global embedding_loader
    print("Initializing EmbeddingLoader...")
    embedding_loader = EmbeddingLoader()
    print("EmbeddingLoader initialized.")

@app.get("/health")
def read_health():
    return {"status": "ok"}
