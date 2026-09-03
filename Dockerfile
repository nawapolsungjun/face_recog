FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# 1. ติดตั้ง System Dependencies ที่จำเป็นสำหรับ compile dlib และ C++
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# 2. ติดตั้ง Dependencies และ face_recognition
RUN pip install --no-cache-dir "setuptools<70" wheel
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir dlib face_recognition

COPY . .

# 3. รันเซิร์ฟเวอร์
CMD ["sh", "-c", "python -m uvicorn api:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]