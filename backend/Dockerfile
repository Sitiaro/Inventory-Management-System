FROM python:3.12-slim

# Keep Python lean and unbuffered for clean container logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code.
COPY ./app ./app

# Run as a non-root user for better security.
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

# Honour the platform-provided $PORT (Render/Railway/Fly) and default to 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
