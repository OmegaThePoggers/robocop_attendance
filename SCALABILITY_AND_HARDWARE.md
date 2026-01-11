# System Scalability & Hardware Requirements

## Scalability Analysis: 30-Person Cohort

### 1. Database & Memory
The current architecture is **highly efficient** for a cohort of 30 people.
- **Memory (RAM):** 
    - Each face encoding is a 128-dimensional vector of floats (approx. 0.5KB). 
    - 30 students = ~15KB of raw text data. Python overhead is negligible.
    - **Limit:** This system can comfortably handle **2,000+ students** in memory before needing a vector database (like Chroma or FAISS).
- **Storage:**
    - SQLite (`attendance.db`) is robust for millions of rows. 30 students * 1 attendance/day * 365 days = ~11,000 records/year. This is trivial for SQLite.

### 2. Processing Speed
- **Complexity:** O(N) where N is the number of known students.
- **Performance:** Comparing a detected face against 30 known signatures takes milliseconds.
- **Bottleneck:** The main bottleneck is **Face Detection** (finding faces in an image), not **Recognition** (matching them).
    - *Detection* depends on image resolution, not the number of students in the DB.
    - *Recognition* depends on N, but N=30 is near-instant.

### 3. Concurrency
- **FastAPI:** Handles multiple requests asynchronously.
- **Recommendation:** usage of 30 people is considered "Small Scale" and will be extremely snappy.

---

## Hardware & Camera Requirements

### 1. Minimum Resolution
For the face recognition model (`dlib`/`cnn`) to work reliably, the face **must be at least 150x150 pixels** within the captured frame.

| Setup Scenario | Distance to Camera | Min Camera Resolution | Notes |
| :--- | :--- | :--- | :--- |
| **Webcam Kiosk** | 0.5 - 1 meter | **720p (HD)** | Sufficient for 1 person at a time close up. |
| **Door Entry** | 1 - 2 meters | **1080p (FHD)** | Standard surveillance resolution. |
| **Classroom CCTV**| 3 - 5+ meters | **4K (UHD)** | Required to get enough pixels on faces at the back. |

### 2. Critical Factors
Resolution is not the only factor. These are equally important:
- **Lighting:** Avoid strong backlighting (windows behind students). Faces must be evenly lit.
- **Motion Blur:** Use a camera with a high shutter speed if students are walking while being scanned. Blur is the #1 cause of failure.
- **Angle:** The model tolerates up to ~30-40 degrees of rotation. Side profiles (90 degrees) will likely fail.

### 3. Recommended Hardware
- **Cheap:** Logitech C920 (1080p) - Great for Kiosks.
- **Pro:** 4K IP Cameras (Hikvision/Dahua) - Better for room surveillance.
- **Embedded:** Raspberry Pi Camera Module 3 - Good start, but Pi CPU is the bottleneck.

## Stress Testing Tool
We have included a script `backend/generate_mock_students.py` that allows you to clone your existing reference images to create 30 (or 100) "Mock Students". This lets you test the UI and performance immediately without recruiting 30 volunteers.
