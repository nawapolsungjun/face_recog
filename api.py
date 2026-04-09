from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import io
import json
import numpy as np
import sqlite3
from PIL import Image, ImageOps  # 🚀 ต้องลง pillow (pip install pillow)

app = FastAPI()

# แก้ไขปัญหา Failed to fetch (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ฟังก์ชันช่วยจัดการรูปภาพ (กันปัญหา 0.99 เพราะรูปเอียงหรือสีเพี้ยน) ---
def process_image_to_np(contents):
    # 1. เปิดรูปด้วย PIL
    img = Image.open(io.BytesIO(contents))
    # 2. ดัดรูปให้ตรงตามแนวตั้งที่ควรจะเป็น (แก้ปัญหารูปจากมือถือเอียง)
    img = ImageOps.exif_transpose(img)
    # 3. บังคับเป็น RGB
    img = img.convert('RGB')
    # 4. แปลงเป็น Numpy Array ให้ face_recognition ใช้งานได้
    return np.array(img)

@app.post("/api/register-face")
async def register_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        # 🚀 ประกาศตัวแปร image_np ที่นี่!
        image_np = process_image_to_np(contents)
        
        # ค้นหา Encoding จาก image_np
        encodings = face_recognition.face_encodings(image_np)
        
        if len(encodings) > 0:
            face_vector = encodings[0].tolist()
            return {"success": True, "face_vector": face_vector}
        
        return {"success": False, "error": "AI หาใบหน้าไม่เจอ กรุณาลองใหม่"}
    except Exception as e:
        print(f"Error: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/check-attendance")
async def check_attendance(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        # 🚀 ประกาศตัวแปร image_np ที่นี่ด้วย!
        image_np = process_image_to_np(contents)
        
        current_encodings = face_recognition.face_encodings(image_np)
        
        if len(current_encodings) == 0:
            return {"success": False, "error": "ไม่พบใบหน้าในรูปที่ส่งมา"}
        
        current_vec = current_encodings[0]

        # ดึงข้อมูลจาก DB
        conn = sqlite3.connect('./attendance-web/prisma/dev.db') # บอสเช็ค Path นี้อีกรอบนะครับ
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name, faceVectors FROM Student") # เช็คชื่อคอลัมน์ให้ตรง (faceVectors)
        students = cursor.fetchall()
        conn.close()

        for student in students:
            name = student['name']
            vector_raw = student['faceVectors']
            if not vector_raw: continue

            # Double Decoding (แก้ปัญหา \ ใน JSON)
            data = json.loads(vector_raw)
            if isinstance(data, str): data = json.loads(data)
            
            if isinstance(data, dict):
                saved_vec = np.array(data.get('front', []), dtype=float)
            else:
                saved_vec = np.array(data, dtype=float)

            # คำนวณความห่าง
            distance = face_recognition.face_distance([saved_vec], current_vec)[0]
            print(f"DEBUG: {name} | Distance: {distance:.4f}")

            if distance < 0.55: # ปรับเกณฑ์ความเข้มงวด
                return {"success": True, "match": True, "studentName": name}

        return {"success": True, "match": False}
    except Exception as e:
        print(f"Error: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)