import face_recognition
import os
import numpy as np
from typing import Dict, List, Tuple

# Define the path to the dataset directory
# Assuming structure: project_root/backend/src/embedding_loader.py and project_root/dataset
DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dataset")

class EmbeddingLoader:
    def __init__(self):
        self.student_embeddings: Dict[str, List[np.ndarray]] = {}
        self.load_embeddings()

    def load_embeddings(self):
        """
        Loads student images from the dataset directory and computes their face embeddings.
        Stores embeddings in a dictionary mapping student names to a list of their embeddings.
        """
        print(f"Loading embeddings from {DATASET_DIR}...")
        if not os.path.exists(DATASET_DIR):
            raise FileNotFoundError(f"Dataset directory '{DATASET_DIR}' not found.")

        for student_name in os.listdir(DATASET_DIR):
            student_dir = os.path.join(DATASET_DIR, student_name)
            if not os.path.isdir(student_dir):
                continue

            print(f"Processing student: {student_name}")
            image_files = [f for f in os.listdir(student_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            if not image_files:
                print(f"Warning: No image files found for student '{student_name}'. Skipping.")
                continue

            self.student_embeddings[student_name] = []

            for image_file in image_files:
                image_path = os.path.join(student_dir, image_file)
                try:
                    image = face_recognition.load_image_file(image_path)
                    face_locations = face_recognition.face_locations(image)

                    if len(face_locations) == 0:
                        print(f"Warning: No face found in {image_file} for {student_name}. Skipping.")
                        continue
                    elif len(face_locations) > 1:
                        print(f"Warning: Multiple faces found in {image_file} for {student_name}. Using the first one.")
                        # For simplicity, we'll use the first detected face.
                        # A more robust system might ask for user intervention or use a different strategy.
                    
                    face_encoding = face_recognition.face_encodings(image, known_face_locations=face_locations)[0]
                    self.student_embeddings[student_name].append(face_encoding)

                except Exception as e:
                    print(f"Error processing {image_file} for {student_name}: {e}")
                    continue
            
            if not self.student_embeddings[student_name]:
                print(f"Error: No valid embeddings loaded for student '{student_name}'. Please check images.")
                del self.student_embeddings[student_name] # Remove student if no embeddings were loaded

        if not self.student_embeddings:
            raise ValueError("No student embeddings were loaded. Please ensure the dataset is correctly populated.")
        
        print("Embeddings loading complete.")

    def get_known_face_encodings(self) -> List[np.ndarray]:
        """Returns a list of all known face encodings."""
        all_encodings = []
        for embeddings in self.student_embeddings.values():
            all_encodings.extend(embeddings)
        return all_encodings

    def get_known_face_names(self) -> List[str]:
        """Returns a list of names corresponding to the known face encodings."""
        all_names = []
        for student_name, embeddings in self.student_embeddings.items():
            all_names.extend([student_name] * len(embeddings))
        return all_names

# Example usage (for testing purposes)
if __name__ == "__main__":
    try:
        loader = EmbeddingLoader()
        print(f"\nLoaded {len(loader.student_embeddings)} students.")
        for student, embeddings in loader.student_embeddings.items():
            print(f"  {student}: {len(embeddings)} embeddings")
        
        # Test case for validation: ensure each student has >=1 embedding
        for student, embeddings in loader.student_embeddings.items():
            assert len(embeddings) >= 1, f"Student {student} has no embeddings!"
        
        print("\nValidation successful: All loaded students have at least one embedding.")

    except Exception as e:
        print(f"An error occurred during example usage: {e}")
