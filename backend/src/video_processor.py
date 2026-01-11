import cv2
import os
import collections
from typing import List, Dict, Tuple
from .recognition import RecognitionService

class VideoProcessor:
    def __init__(self, recognition_service: RecognitionService):
        self.recognition_service = recognition_service

    def process_video(self, video_path: str, interval: int = 1) -> Dict:
        """
        Processes a video file, extracting frames at a given interval (in seconds),
        and recognizing faces in each frame.
        
        Args:
            video_path: Path to the video file.
            interval: Time interval in seconds between processed frames.
            
        Returns:
            Dict containing the consensus identity and detailed frame results.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            # Fallback if FPS cannot be determined, though unlikely for valid videos
            fps = 30 
        
        frame_interval = int(fps * interval)
        
        frame_count = 0
        all_detections = []
        
        while True:
            success, frame = cap.read()
            if not success:
                break
            
            # Process only frames at the specified interval
            if frame_count % frame_interval == 0:
                # Convert BGR (OpenCV) to RGB (face_recognition)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # We interpret the numpy array as an image file 
                # face_recognition can accept a numpy array directly too
                results = self.recognition_service.recognize_image(rgb_frame)
                
                for res in results:
                    all_detections.append(res['name'])
            
            frame_count += 1
            
        cap.release()
        
        # Consensus Logic: Multi-Face Support
        if not all_detections:
            return {"identities": [], "details": "No faces detected in sampled frames"}
            
        counter = collections.Counter(all_detections)
        
        # Filter out "Unknown" if there are other detections, or keep it if it's the only one
        # but attendance service will filter Unknown anyway.
        
        # We return all names that were detected. 
        # In a real scenario, you might want a threshold (e.g. appears in at least 20% of frames).
        # For this short 5s video (5 frames), appearing once is significant enough for a prototype.
        verified_identities = [name for name, count in counter.most_common() if name != "Unknown"]
        
        if not verified_identities and counter["Unknown"] > 0:
             verified_identities = ["Unknown"]

        return {
            "identities": verified_identities,
            "total_frames_processed": frame_count // frame_interval if frame_count > 0 else 0,
            "vote_counts": dict(counter)
        }
