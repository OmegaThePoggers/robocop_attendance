FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for dlib, face_recognition, opencv, and postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml first to cache pip installs
COPY pyproject.toml ./

# Install dependencies using pip 
# (Installing them directly since we just have a pyproject.toml without poetry/pipenv for now, we'll parse it or just install the same packages)
RUN pip install --no-cache-dir \
    "fastapi>=0.100.0,<0.112.0" \
    "uvicorn[standard]>=0.20.0,<0.30.0" \
    "face-recognition==1.3.0" \
    "numpy==1.24.4" \
    "setuptools" \
    "face-recognition-models @ git+https://github.com/ageitgey/face_recognition_models" \
    "python-multipart" \
    "opencv-python-headless" \
    "sqlmodel" \
    "passlib[argon2]" \
    "python-jose[cryptography]" \
    "slowapi" \
    "psycopg2-binary"

# Copy application code
COPY src/ src/

# Expose port
EXPOSE 8000

# Set environment variables for production-like behavior
ENV PYTHONUNBUFFERED=1
ENV TZ=UTC

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
