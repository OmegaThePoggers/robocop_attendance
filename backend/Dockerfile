FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for dlib, face_recognition, and opencv
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN pip install uv

# Copy project definition
COPY pyproject.toml .

# Install dependencies using uv
RUN uv sync
# Alternatively, if you want to install into system python in container:
# RUN pip install "fastapi>=0.100.0,<0.112.0" "uvicorn[standard]>=0.20.0,<0.30.0" "face-recognition==1.3.0" "numpy==1.24.4" "setuptools" "face-recognition-models @ git+https://github.com/ageitgey/face_recognition_models" "python-multipart" "opencv-python-headless" "sqlmodel"

# Copy application code
COPY src/ src/
COPY dataset/ dataset/
# Note: In production, dataset might be better as a volume, but for "out of box" experience, copying is okay if small. 
# However, usually we want dataset to be persistent. We'll rely on docker-compose volume for persistence.

# Expose port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
