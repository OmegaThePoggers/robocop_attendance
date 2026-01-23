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

### 4. Long Range Detection (10+ Meters)
Detecting faces at 10 meters is computationally and optically challenging.

#### The Math
- **Face Size:** An average face is ~15cm wide.
- **Requirement:** Reliable detection needs ~80 pixels of face width.
- **Pixel Density:** You need roughly **5.3 pixels per cm** at the target distance.
- **At 10 Meters:**
    - A standard 90° FOV webcam covers ~20 meters width at 10m distance.
    - **1080p (1920px width):** 1920px / 2000cm = **~1 pixel/cm**. (Result: ~15px face. **FAIL**)
    - **4K (3840px width):** ~2 pixels/cm. (Result: ~30px face. **Detects only with heavy Upsampling**)
    - **8K (7680px width):** ~4 pixels/cm. (Result: ~60px face. **Passable**)

#### The Solution
You cannot solve this with just software. You need **Optical Zoom**.
- **Lens:** Use a telephoto lens (Narrow Field of View).
- **Example:** A 16mm or 25mm lens (instead of standard 3mm) reduces FOV to ~15-20°.
- **Result:** The camera only sees a 3-4 meter wide slice at 10m distance. 
- **1080p with Zoom Lens:** 1920px / 400cm = **4.8 pixels/cm**. (Result: ~72px face. **SUCCESS**)

#### Recommendation for 10m:
1.  **Hardware:** Do NOT use a webcam. Use a **C-Mount Camera** (e.g., Raspberry Pi HQ Camera or industrial camera) with a **16mm-25mm Telephoto Lens**.
2.  **Software:** Use `upsample=1` or `upsample=2`. Ensure lighting is perfect.
3.  **Compute:** Processing 4K/8K images requires a dedicated **GPU (CUDA)**. CPU processing will take seconds per frame.

### 5. Cheapest Possible Setup (Budget < $50)

If you have a strict budget, here is the absolute cheapest way to deploy this:

#### Option A: "The Laptop Kiosk" (Cost: $0 - $30)
Use the teacher's existing laptop as the server and camera.
1.  **Hardware**: Laptop (Teacher's PC) + Built-in Webcam (or external USB Webcam ~$25).
2.  **Setup**: 
    - Run the Docker container on the laptop.
    - Place laptop on a desk facing the entrance or pass it around.
    - Students walk up to the laptop to scan.
3.  **Pros**: Free (if hardware exists), Fast (Laptop CPUs are faster than Pi).
4.  **Cons**: Occupies teacher's laptop.

#### Option B: "The Doorbell" (Raspberry Pi Zero 2 W) (Cost: ~$40)
*Warning: Slow performance. Only for patient users.*
1.  **Hardware**: Raspberry Pi Zero 2 W ($15) + Pi Camera V2 ($25).
2.  **Setup**: Mount at the door. Runs headless backend.
3.  **Performance**: Recognition will take ~5-8 seconds per face.
4.  **Recommendation**: Use a **Raspberry Pi 4 (4GB)** ($50) for decent speed (1-2s).

## Stress Testing Tool
We have included a script `backend/generate_mock_students.py` that allows you to clone your existing reference images to create 30 (or 100) "Mock Students". This lets you test the UI and performance immediately without recruiting 30 volunteers.
