import os
import shutil
from sqlmodel import Session, select
from src.database import engine, create_db_and_tables
from src.models import User, UserRole, ClassGroup
from src.auth_service import get_password_hash

def seed_database():
    print("Recreating database tables...")
    create_db_and_tables()

    with Session(engine) as session:
        # Check if admin already exists
        admin = session.exec(select(User).where(User.username == "admin")).first()
        if not admin:
            print("Seeding Admin User...")
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin"),
                role=UserRole.ADMIN,
                full_name="System Administrator"
            )
            session.add(admin_user)

        # Check if teacher already exists
        teacher = session.exec(select(User).where(User.username == "teacher")).first()
        if not teacher:
            print("Seeding Teacher User...")
            teacher_user = User(
                username="teacher",
                password_hash=get_password_hash("teacher"),
                role=UserRole.TEACHER,
                full_name="Demo Teacher"
            )
            session.add(teacher_user)

        # Create a default class
        demo_class = session.exec(select(ClassGroup).where(ClassGroup.name == "Demo Class")).first()
        if not demo_class:
            print("Seeding Demo Class...")
            demo_class = ClassGroup(
                name="Demo Class",
                description="Default class for testing"
            )
            session.add(demo_class)

        session.commit()
        print("Database seeding completed.")

if __name__ == "__main__":
    # Ensure dataset directory exists and is clean
    dataset_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
    if not os.path.exists(dataset_dir):
        os.makedirs(dataset_dir)
        print(f"Created dataset directory at {dataset_dir}")

    seed_database()
