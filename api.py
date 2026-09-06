import os
import gc
import cv2
import numpy as np
import base64
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import face_recognition

app = FastAPI(title="Face Recognition AI Service")

# อนุญาต CORS สำหรับการเรียกใช้งานจาก Frontend (Vercel / Localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageBase64Request(BaseModel):
    image: str

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Face Recognition API"}

# -------------------------------------------------------------------
# 1. API สกัดเวกเตอร์จากโหมดตรวจจับท่าทาง (Single Shot Base64 จาก Webcam)
# -------------------------------------------------------------------
@app.post("/api/extract-vector")
async def extract_vector(payload: ImageBase64Request):
    img = None
    rgb_img = None
    try:
        header, encoded = payload.image.split(",", 1) if "," in payload.image else ("", payload.image)
        image_data = base64.b64decode(encoded)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="ไม่สามารถอ่านข้อมูลรูปภาพได้")

        # แปลง BGR เป็น RGB สำหรับ face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # ตรวจหาใบหน้าโดยใช้ HOG model (ประหยัด RAM เหมาะกับ Free Tier บน Render)
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            return {"success": False, "message": "ไม่พบใบหน้าในภาพ"}

        # สกัด Feature Vector 128 มิติ
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if not face_encodings:
            return {"success": False, "message": "ไม่สามารถสกัดเวกเตอร์ใบหน้าได้"}

        vector = face_encodings[0].tolist()

        return {"success": True, "vector": vector}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # เคลียร์หน่วยความจำทันทีหลังประมวลผลเสร็จ
        del img
        del rgb_img
        gc.collect()

# -------------------------------------------------------------------
# 2. API ลงทะเบียนหลายรูปภาพ (Multi-Upload รองรับรูปที่ Crop มาแล้ว)
# -------------------------------------------------------------------
@app.post("/api/register-face-multi")
async def register_face_multi(files: List[UploadFile] = File(...)):
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="ไม่พบไฟล์รูปภาพ")

    face_vectors = []

    # วนลูปอ่านและประมวลผลทีละรูปเพื่อคุมการใช้ RAM ไม่ให้พุ่งสูง
    for file in files:
        img = None
        rgb_img = None
        try:
            image_bytes = await file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                continue

            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # ค้นหาตำแหน่งใบหน้า
            face_locations = face_recognition.face_locations(rgb_img, model="hog")

            # หากรูปถูกครอบตัดมาจาก Frontend เรียบร้อยแล้วจนไม่พบ Landmark รอบนอก ให้ใช้ขนาดภาพทั้งหมดเป็นกรอบใบหน้า
            if not face_locations:
                h, w, _ = rgb_img.shape
                face_locations = [(0, w, h, 0)]

            encodings = face_recognition.face_encodings(rgb_img, face_locations)
            if encodings:
                face_vectors.append(encodings[0].tolist())

        except Exception as err:
            print(f"Error processing {file.filename}: {err}")

        finally:
            # คืน RAM ให้เซิร์ฟเวอร์ Render ในแต่ละรอบลูปทันที ป้องกัน Memory Crash
            del img
            del rgb_img
            gc.collect()

    if len(face_vectors) == 0:
        return {"success": False, "message": "ไม่สามารถสกัดเวกเตอร์ใบหน้าจากภาพที่ส่งมาได้"}

    return {
        "success": True,
        "message": f"สกัดข้อมูลใบหน้าสำเร็จ {len(face_vectors)} รูป",
        "face_vectors": face_vectors
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)