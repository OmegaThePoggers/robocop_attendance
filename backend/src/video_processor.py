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
        best_metadata_by_name = {}

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
                    name = res['name']
                    all_detections.append(name)
                    
                    # Track best metadata (lowest distance)
                    dist = res.get('distance', 1.0)
                    if name not in best_metadata_by_name or dist < best_metadata_by_name[name]['distance']:
                        best_metadata_by_name[name] = res
            
            frame_count += 1
            
        cap.release()
        
        # Consensus Logic: Multi-Face Support
        if not all_detections:
            return {"identities": [], "details": "No faces detected in sampled frames", "metadata": {}}
            
        counter = collections.Counter(all_detections)
        verified_identities = [name for name, count in counter.most_common() if name != "Unknown"]
        
        if not verified_identities and counter["Unknown"] > 0:
             verified_identities = ["Unknown"]

        # Filter best_metadata to only verified identities
        final_metadata = {name: best_metadata_by_name[name] for name in verified_identities if name in best_metadata_by_name}

        return {
            "identities": verified_identities,
            "total_frames_processed": frame_count // frame_interval if frame_count > 0 else 0,
            "vote_counts": dict(counter),
            "metadata": final_metadata
        }
