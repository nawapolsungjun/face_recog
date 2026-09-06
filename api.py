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

# อนุญาต CORS สำหรับทั้ง Localhost และ Production (Vercel)
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

# -------------------------------------------------------------
# 1. API สกัดเวกเตอร์จากกล้องหน้าเว็บ (Single Shot Base64)
# -------------------------------------------------------------
@app.post("/api/extract-vector")
async def extract_vector(payload: ImageBase64Request):
    try:
        header, encoded = payload.image.split(",", 1) if "," in payload.image else ("", payload.image)
        image_data = base64.b64decode(encoded)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์รูปภาพได้")

        # แปลง BGR เป็น RGB สำหรับ face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # ตรวจจับตำแหน่งใบหน้า (ใช้โมเดล HOG ที่กิน RAM ต่ำและรวดเร็ว)
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            return {"success": False, "message": "ไม่พบใบหน้าในภาพ"}

        # ดึงเวกเตอร์ 128 มิติ
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if not face_encodings:
            return {"success": False, "message": "ไม่สามารถสกัดเวกเตอร์ใบหน้าได้"}

        vector = face_encodings[0].tolist()

        # คืนหน่วยความจำ
        del image_data, nparr, img, rgb_img, face_locations, face_encodings
        gc.collect()

        return {"success": True, "vector": vector}
    except Exception as e:
        gc.collect()
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 2. API ลงทะเบียนหลายรูปภาพ (Multi-Upload รองรับรูปจาก Client Crop)
# -------------------------------------------------------------
@app.post("/api/register-face-multi")
async def register_face_multi(files: List[UploadFile] = File(...)):
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="ไม่มีไฟล์รูปภาพถูกส่งมา")

    face_vectors = []

    for file in files:
        img = None
        rgb_img = None
        try:
            # 1. อ่านข้อมูลไฟล์ทีละไฟล์
            image_bytes = await file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                continue

            # 2. แปลงเป็น RGB
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # 3. หาพิกัดใบหน้า
            face_locations = face_recognition.face_locations(rgb_img, model="hog")

            # กรณีรูปที่ถูก Crop จากหน้าเว็บมาแล้ว อาจจะกินพื้นที่เกือบทั้งภาพ
            if not face_locations:
                # กำหนดกรอบครอบคลุมทั้งภาพหากหน้าเว็บตัดกรอบใบหน้ามาตรงแล้ว
                h, w, _ = rgb_img.shape
                face_locations = [(0, w, h, 0)]

            # 4. สกัดเวกเตอร์
            encodings = face_recognition.face_encodings(rgb_img, face_locations)
            if encodings:
                face_vectors.append(encodings[0].tolist())

        except Exception as err:
            print(f"Error processing {file.filename}: {err}")
        finally:
            # 5. ทำลายตัวแปรในรอบนั้นและสั่ง Garbage Collector ทำงานทันที
            del img
            del rgb_img
            gc.collect()

    if len(face_vectors) == 0:
        return {"success": False, "message": "ไม่สามารถสกัดเวกเตอร์ใบหน้าจากภาพที่อัปโหลดได้เลย"}

    return {
        "success": True,
        "message": f"สกัดข้อมูลใบหน้าสำเร็จ {len(face_vectors)} มุม",
        "face_vectors": face_vectors
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)