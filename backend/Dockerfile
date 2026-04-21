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
# Since we have pyproject.toml, we can install the package and its dependencies
RUN pip install --no-cache-dir .

# Copy application code
COPY src/ src/

# Expose port
EXPOSE 8000

# Set environment variables for production-like behavior
ENV PYTHONUNBUFFERED=1
ENV TZ=UTC

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
