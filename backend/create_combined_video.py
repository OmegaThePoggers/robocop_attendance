import cv2
import numpy as np
import os
import subprocess

def create_combined_video(output_path: str, duration: int = 5, fps: int = 30):
    """
    Creates a video transitioning between Albert Einstein and Marie Curie artifacts.
    Prerequisite: Artifact images must exist in the artifacts folder.
    """
    # Paths to artifacts (using the known paths from the conversation context)
    # We will copy them from the artifacts/brain folder if accessible, or use the dataset source.
    # Let's use the dataset source for reliability as found by the find_by_name tool.
    
    # We need to find the specific files. I'll hardcode based on standard structure if find_by_name returns expectable results,
    # or I will update this script after seeing the file list.
    # For now, I'll assume standard locations based on previous context.
    
    img1_path = "/home/omegafied/projects/robocop_attendance/dataset/student_1_albert_einstein/image1.png"
    img2_path = "/home/omegafied/projects/robocop_attendance/dataset/student_2_marie_curie/image1.png"
    
    if not os.path.exists(img1_path) or not os.path.exists(img2_path):
        print(f"Error: Images not found at expected paths.")
        print(f"Check: {img1_path}")
        print(f"Check: {img2_path}")
        return

    # Read images
    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)
    
    if img1 is None or img2 is None:
        print("Error reading images with OpenCV")
        return

    # Resize to have same height
    height = 500
    w1 = int(img1.shape[1] * (height / img1.shape[0]))
    w2 = int(img2.shape[1] * (height / img2.shape[0]))
    
    img1 = cv2.resize(img1, (w1, height))
    img2 = cv2.resize(img2, (w2, height))
    
    # Create a canvas wide enough for both side-by-side
    total_width = w1 + w2 + 50 # 50px padding
    canvas = np.zeros((height, total_width, 3), dtype=np.uint8)
    
    # Place images
    canvas[:, :w1] = img1
    canvas[:, w1+50:] = img2
    
    # Save a temporary frame
    temp_frame = "temp_combined.png"
    cv2.imwrite(temp_frame, canvas)
    
    # Generate video using ffmpeg
    # Loop the single image for {duration} seconds
    cmd = [
        'ffmpeg', '-y', '-loop', '1', '-i', temp_frame, 
        '-c:v', 'libx264', '-t', str(duration), '-pix_fmt', 'yuv420p', 
        '-vf', f'scale={total_width}:{height}',
        output_path
    ]
    
    print(f"Running ffmpeg to create {output_path}...")
    subprocess.run(cmd, check=True)
    
    # Cleanup
    if os.path.exists(temp_frame):
        os.remove(temp_frame)
    print("Video generation complete.")

if __name__ == "__main__":
    create_combined_video("/home/omegafied/projects/robocop_attendance/backend/test_combined.mp4")
