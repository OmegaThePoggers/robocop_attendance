import os
import cv2
from sqlmodel import Session, select
from .models import User, UserRole, StudentFace
from .ai.pipeline import pipeline

DATASET_DIR = os.getenv("DATASET_PATH")
if not DATASET_DIR:
    DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dataset")

def seed_dataset(db: Session):
    print(f"Checking if pgvector needs seeding from {DATASET_DIR}...")
    if not os.path.exists(DATASET_DIR):
        print(f"Dataset directory '{DATASET_DIR}' not found. Skipping seeding.")
        return

    # Build set of student_ids that already have embeddings
    existing_embedded = {sf.student_id for sf in db.exec(select(StudentFace)).all()}

    seeded_count = 0
    for student_name in os.listdir(DATASET_DIR):
        student_dir = os.path.join(DATASET_DIR, student_name)
        if not os.path.isdir(student_dir):
            continue

        # Skip if this student already has embeddings
        if student_name in existing_embedded:
            print(f"Skipping {student_name} — already in pgvector.")
            continue

        image_files = [f for f in os.listdir(student_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not image_files:
            print(f"No images found for {student_name}, skipping.")
            continue

        print(f"Seeding new student: {student_name}")

        # Ensure user exists for the embedding relation
        user = db.exec(select(User).where(User.username == student_name)).first()
        if not user:
            from .auth_service import get_password_hash
            user = User(
                username=student_name,
                password_hash=get_password_hash("robocop"),
                role=UserRole.STUDENT
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        for image_file in image_files:
            image_path = os.path.join(student_dir, image_file)
            try:
                bgr_image = cv2.imread(image_path)
                if bgr_image is None:
                    print(f"  Could not read image: {image_file}")
                    continue

                # Detect and embed
                aligned_crops, raw_faces, _ = pipeline.detector.detect_and_align(bgr_image)
                if not aligned_crops:
                    print(f"  No face detected in {image_file} for {student_name}")
                    continue

                # Take the first face (dataset should contain clear, individual photos)
                embeddings = pipeline.embedder.generate_batch_from_crops([aligned_crops[0]])

                sf = StudentFace(student_id=student_name, embedding=embeddings[0].tolist())
                db.add(sf)
                db.commit()
                seeded_count += 1
                print(f"  Embedded {image_file} for {student_name}")

            except Exception as e:
                print(f"  Error processing {image_file} for {student_name}: {e}")

    print(f"Seeding complete. {seeded_count} new embedding(s) added.")


class EmbeddingLoader:
    """Wrapper class used as a FastAPI dependency for on-demand embedding loading."""

    def load_embeddings(self):
        """Re-run the dataset seeding (idempotent — skips existing embeddings)."""
        from sqlmodel import Session as _Session
        from .database import engine as _engine
        with _Session(_engine) as db:
            seed_dataset(db)
