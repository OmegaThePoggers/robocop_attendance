import subprocess
import os

def create_test_video(image_path, output_path, duration=5):
    """
    Creates a video from a single image using ffmpeg.
    """
    cmd = [
        "ffmpeg",
        "-y", # Overwrite output
        "-loop", "1",
        "-i", image_path,
        "-c:v", "libx264",
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        "-vf", "scale=640:480",
        output_path
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    print(f"Video created at {output_path}")

if __name__ == "__main__":
    img_path = "/home/omegafied/projects/robocop_attendance/dataset/student_1_albert_einstein/image1.png"
    out_path = "test_einstein.mp4"
    if os.path.exists(img_path):
        create_test_video(img_path, out_path)
    else:
        print(f"Image not found at {img_path}")
