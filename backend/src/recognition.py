import face_recognition
import numpy as np
from typing import List, Dict, Optional, Tuple
from .embedding_loader import EmbeddingLoader

class RecognitionService:
    def __init__(self, embedding_loader: EmbeddingLoader):
        self.embedding_loader = embedding_loader

    def recognize_image(self, image_file, tolerance: float = 0.6) -> List[Dict]:
        """
        Detects faces in an image and matches them against known students.
        
        Args:
            image_file: numpy array or file-like object compatible with face_recognition.load_image_file
            tolerance: Euclidean distance threshold for matching. Lower is stricter.
            
        Returns:
            List of dictionaries containing 'name', 'bounding_box', and 'distance'.
        """
        # Load image (if it's a file path or file-like object)
        # Note: In FastAPI, we'll likely pass the bytes or a file-like object.
        # face_recognition.load_image_file handles path or file object.
        image = image_file
        if not isinstance(image, np.ndarray):
            # Load image if it's not already a numpy array (e.g. file path or file-like object)
            image = face_recognition.load_image_file(image_file)
        
        # Detect face locations (using HOG by default for speed/CPU)
        # First pass: Default upsampling (1)
        face_locations = face_recognition.face_locations(image)
        
        # Second pass: If no faces found, try upsampling for smaller/blurry faces
        if not face_locations:
             print("No faces found in first pass. Retrying with upsample=2...")
             face_locations = face_recognition.face_locations(image, number_of_times_to_upsample=2)

        # Third pass: If still no faces, try CNN (slower but handles partial/occluded faces better)
        if not face_locations:
             print("No faces found in second pass. Retrying with CNN model...")
             try:
                 face_locations = face_recognition.face_locations(image, number_of_times_to_upsample=1, model="cnn")
             except Exception as e:
                 print(f"CNN model failed (possibly no GPU or memory issue): {e}")

        if not face_locations:
            return []

        # Compute encodings
        face_encodings = face_recognition.face_encodings(image, known_face_locations=face_locations)

        known_encodings = self.embedding_loader.get_known_face_encodings()
        known_names = self.embedding_loader.get_known_face_names()

        results = []

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            name = "Unknown"
            distance = 0.0
            
            if known_encodings:
                # Calculate distances to all known faces
                face_distances = face_recognition.face_distance(known_encodings, face_encoding)
                
                # Find the best match
                best_match_index = np.argmin(face_distances)
                if face_distances[best_match_index] <= tolerance:
                    name = known_names[best_match_index]
                    distance = float(face_distances[best_match_index])
                else:
                    # Logic for unknown: we take the min distance even if it's unknown, for debugging
                    distance = float(face_distances[best_match_index])

            results.append({
                "name": name,
                "bounding_box": [top, right, bottom, left], # CSS order: top, right, bottom, left
                "distance": distance
            })

        return results
