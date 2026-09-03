FROM python:3.11-slim

# เพิ่ม git และ dependencies สำหรับ dlib/opencv
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# ติดตั้งโมเดลผ่าน zip ตรงๆ โดยไม่จำเป็นต้องใช้ git clone
RUN pip install --no-cache-dir --no-build-isolation https://github.com/ageitgey/face_recognition_models/archive/refs/heads/master.zip

COPY . .

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]