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

    # Check if we already have faces
    existing_faces = db.exec(select(StudentFace)).first()
    if existing_faces:
        print("pgvector database already contains face embeddings. Skipping seeding.")
        return
        
    for student_name in os.listdir(DATASET_DIR):
        student_dir = os.path.join(DATASET_DIR, student_name)
        if not os.path.isdir(student_dir):
            continue

        print(f"Processing student for seeding: {student_name}")
        image_files = [f for f in os.listdir(student_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not image_files:
            continue

        # Ensure user exists for the embedding relation
        user = db.exec(select(User).where(User.username == student_name)).first()
        if not user:
            from .auth_service import get_password_hash
            # We seed a default user using 'robocop' as the default password for dataset students
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
                    continue
                
                # Detect and embed
                aligned_crops, raw_faces, _ = pipeline.detector.detect_and_align(bgr_image)
                if not aligned_crops: 
                    continue
                
                # Take the first face (assumption: dataset contains cropped/clear faces)
                embeddings = pipeline.embedder.generate_batch_from_crops([aligned_crops[0]])
                
                # Insert to DB
                sf = StudentFace(student_id=student_name, embedding=embeddings[0].tolist())
                db.add(sf)
                db.commit()
                
            except Exception as e:
                print(f"Error processing {image_file} for {student_name}: {e}")
                
    print("Seeding complete.")


class EmbeddingLoader:
    """Wrapper class used as a FastAPI dependency for on-demand embedding loading."""

    def load_embeddings(self):
        """Re-run the dataset seeding (idempotent — skips existing embeddings)."""
        from sqlmodel import Session as _Session
        from .database import engine as _engine
        with _Session(_engine) as db:
            seed_dataset(db)
