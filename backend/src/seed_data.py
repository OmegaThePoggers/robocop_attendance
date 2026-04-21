"""
Seed script: Creates teachers, classes, and students in the database.
All accounts use password 'robocop'.

Usage (inside Docker):
  docker compose exec backend python -m src.seed_data

Usage (locally with DATABASE_URL set):
  python -m src.seed_data
"""

from sqlmodel import Session, select
from .database import engine, create_db_and_tables
from .models import User, UserRole, ClassGroup
from .auth_service import get_password_hash

PASSWORD = "robocop"

# ── Data to seed ─────────────────────────────────────────────────────
# Matches the dataset/ folder structure on disk
CLASSES = [
    {"name": "CS-A", "description": "Computer Science - Section A"},
]

TEACHERS = [
    {"username": "teacher_cs_a", "full_name": "Dr. Sharma", "class_name": "CS-A"},
]

# Students whose face images exist in dataset/
# face_identity must match the dataset folder name used by embedding_loader
STUDENTS = [
    {"username": "student_1_albert_einstein", "full_name": "Albert Einstein", "sap_id": "60004230001", "face_identity": "student_1_albert_einstein", "class_name": "CS-A"},
    {"username": "student_2_marie_curie",     "full_name": "Marie Curie",     "sap_id": "60004230002", "face_identity": "student_2_marie_curie",     "class_name": "CS-A"},
]


def seed():
    create_db_and_tables()
    hashed = get_password_hash(PASSWORD)

    with Session(engine) as session:
        # ── 1. Classes ───────────────────────────────────────────────
        class_map: dict[str, int] = {}
        for cls in CLASSES:
            existing = session.exec(
                select(ClassGroup).where(ClassGroup.name == cls["name"])
            ).first()
            if existing:
                class_map[cls["name"]] = existing.id
                print(f"  [SKIP] Class '{cls['name']}' already exists (id={existing.id})")
            else:
                obj = ClassGroup(name=cls["name"], description=cls["description"])
                session.add(obj)
                session.flush()  # populate obj.id
                class_map[cls["name"]] = obj.id
                print(f"  [NEW]  Class '{cls['name']}' created (id={obj.id})")

        # ── 2. Teachers ──────────────────────────────────────────────
        for t in TEACHERS:
            existing = session.exec(
                select(User).where(User.username == t["username"])
            ).first()
            if existing:
                print(f"  [SKIP] Teacher '{t['username']}' already exists")
                continue
            user = User(
                username=t["username"],
                password_hash=hashed,
                role=UserRole.TEACHER,
                full_name=t["full_name"],
                class_id=class_map.get(t["class_name"]),
            )
            session.add(user)
            print(f"  [NEW]  Teacher '{t['username']}' → class '{t['class_name']}'")

        # ── 3. Students ──────────────────────────────────────────────
        for s in STUDENTS:
            existing = session.exec(
                select(User).where(User.username == s["username"])
            ).first()
            if existing:
                print(f"  [SKIP] Student '{s['username']}' already exists")
                continue
            user = User(
                username=s["username"],
                password_hash=hashed,
                role=UserRole.STUDENT,
                full_name=s["full_name"],
                sap_id=s.get("sap_id"),
                face_identity=s.get("face_identity"),
                class_id=class_map.get(s["class_name"]),
            )
            session.add(user)
            print(f"  [NEW]  Student '{s['username']}' → class '{s['class_name']}'")

        session.commit()
        print("\n[SEED] Done. All accounts use password: 'robocop'")


if __name__ == "__main__":
    print("[SEED] Seeding teachers, classes, and students...")
    seed()
