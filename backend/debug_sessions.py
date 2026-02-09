from sqlmodel import Session, select
from datetime import datetime
from src.database import engine
from src.models import AttendanceSession

def check_sessions():
    with Session(engine) as session:
        sessions = session.exec(select(AttendanceSession)).all()
        print(f"Total Sessions: {len(sessions)}")
        for s in sessions:
            print(f"ID: {s.id}, Name: {s.name}, Active: {s.is_active}, Created: {s.created_at}, Ended: {s.end_time}")

if __name__ == "__main__":
    check_sessions()
