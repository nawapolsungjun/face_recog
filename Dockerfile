FROM python:3.11-slim

# ตั้งค่าไม่ให้บัฟเฟอร์ log และลด overhead ของ memory
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# บังคับใช้ setuptools<70 เพื่อให้ pkg_resources ใช้งานได้แน่นอนในคอนเทนเนอร์
RUN pip install --no-cache-dir "setuptools<70" wheel
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --no-build-isolation https://github.com/ageitgey/face_recognition_models/archive/refs/heads/master.zip

COPY . .

ENV PYTHONUNBUFFERED=1

# ใช้ PORT จาก Environment Variable ของ Render (ปกติ Render บังคับใช้ port 10000)
CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1