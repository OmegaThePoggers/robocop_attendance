import os
import shutil
import random
import argparse

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

def generate_mock_students(count=30, source_student="student_1_albert_einstein"):
    """
    Creates 'count' number of mock students by copying images from 'source_student'.
    """
    source_path = os.path.join(DATASET_DIR, source_student)
    
    if not os.path.exists(source_path):
        print(f"Error: Source student '{source_student}' not found in {DATASET_DIR}")
        print("Available students:", os.listdir(DATASET_DIR))
        return

    print(f"Generating {count} mock students using '{source_student}' as template...")
    
    for i in range(1, count + 1):
        # Create a unique name
        # We use a random suffix so names look distinct in the UI
        new_name = f"student_{100+i}_mock_user_{i}"
        new_path = os.path.join(DATASET_DIR, new_name)
        
        if os.path.exists(new_path):
            print(f"  Skipping {new_name} (already exists)")
            continue
            
        # Create directory
        os.makedirs(new_path)
        
        # Copy images
        for file in os.listdir(source_path):
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                src_file = os.path.join(source_path, file)
                dst_file = os.path.join(new_path, file)
                shutil.copy2(src_file, dst_file)
        
        print(f"  Created {new_name}")

    print("\nDone! Please restart the backend server to load the new embeddings.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate mock students for load testing.")
    parser.add_argument("--count", type=int, default=30, help="Number of students to generate")
    args = parser.parse_args()
    
    try:
        # Find a valid source student dynamically if default doesn't exist
        available = [d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))]
        if available:
            source = available[0]
            generate_mock_students(args.count, source)
        else:
            print("No source data found in dataset directory!")
    except Exception as e:
        print(f"An error occurred: {e}")
