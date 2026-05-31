# Stage 1: Build & Dependency Installation
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH=/root/.local/bin:$PATH

WORKDIR /app

# Install system utilities needed during build/compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Optimize package installation:
# 1. Use pip cache mount to accelerate rebuilds.
# 2. Pull CPU-specific wheels for torch/ultralytics to save >2 GB of space (no GPU/CUDA binary).
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --user --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Stage 2: Final Runtime Image
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH=/home/appuser/.local/bin:$PATH

WORKDIR /app

# Install minimal system libraries for OpenCV/Python runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Run as non-privileged security user
RUN useradd -u 10001 -m appuser && chown -R appuser:appuser /app
USER appuser

# Copy installed packages from builder stage
COPY --from=builder --chown=appuser:appuser /root/.local /home/appuser/.local

# Copy application source code
COPY --chown=appuser:appuser . .

EXPOSE 8501
EXPOSE 8001

RUN chmod +x start.sh

CMD ["./start.sh"]
