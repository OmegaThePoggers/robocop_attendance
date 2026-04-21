import os
from sqlmodel import SQLModel, create_engine, Session

# Try to get DATABASE_URL from environment (Docker Compose provides this)
# Fallback to a local postgres connection if running outside of Docker but with a local PG server
database_url = os.getenv(
    "DATABASE_URL", 
    "postgresql://robocop_user:robocop_password@localhost:5432/robocop_db"
)

# SQLite uses check_same_thread, Postgres doesn't need it.
engine = create_engine(database_url)

from sqlalchemy import text

def create_db_and_tables():
    # Ensure pgvector extension exists before creating tables
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
