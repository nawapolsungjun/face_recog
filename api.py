from fastapi import FastAPI, File, UploadFile, Form  # <--- ต้องมี Form ตรงนี้
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import io
import json
import numpy as np
import sqlite3
from PIL import Image, ImageOps

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

@app.post("/api/check-attendance-group")
async def check_attendance_group(
    file: UploadFile = File(...),
    boxes: str = Form(...)
):
    conn = None
    try:
        contents = await file.read()
        image_np = process_image_to_np(contents)
        img_h, img_w, _ = image_np.shape

        face_boxes_js = json.loads(boxes)
        face_locations = []
        for box in face_boxes_js:
            # แปลงจาก x, y, w, h เป็น top, right, bottom, left
            top = max(0, int(box['y']))
            right = min(img_w, int(box['x'] + box['width']))
            bottom = min(img_h, int(box['y'] + box['height']))
            left = max(0, int(box['x']))
            face_locations.append((top, right, bottom, left))

        if not face_locations:
            return {"success": True, "matches": []}

        # ดึง Encoding ของทุกใบหน้าในรูปกลุ่ม
        current_encodings = face_recognition.face_encodings(image_np, known_face_locations=face_locations)
        
        # 🚀 จุดสำคัญ: เปิด DB ครั้งเดียว และดึงข้อมูลมาไว้ในตัวแปร students
        conn = sqlite3.connect('./attendance-web/prisma/dev.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name, faceVectors FROM Student")
        students = cursor.fetchall()
        conn.close() # ปิดได้เลยเพราะเรามีข้อมูลในตัวแปร students แล้ว

        final_matches = []
        for current_vec in current_encodings:
            best_match = None
            min_distance = 0.60  # เกณฑ์มาตรฐาน (ยิ่งน้อยยิ่งเข้มงวด)

        for student in students:
            name = student['name']
            vector_raw = student['faceVectors']
            if not vector_raw: continue

            try:
                # แปลงข้อมูล Vector จาก Database
                data = json.loads(vector_raw)
                while isinstance(data, str): data = json.loads(data)
                saved_vec = np.array(data.get('front', data) if isinstance(data, dict) else data, dtype=float)
            
                # คำนวณค่าความต่าง (Distance)
                distance = face_recognition.face_distance([saved_vec], current_vec)[0]

            # ตรวจสอบว่า "Match" หรือไม่
                if distance < min_distance:
                    min_distance = distance
                    best_match = name  # ถ้าค่าน้อยกว่าเกณฑ์ ให้ถือว่าเป็นคนนี้
            except:
                continue
    
    # เก็บชื่อที่ Match ได้ลงในรายการ (ถ้าไม่พบจะเป็น None)
        final_matches.append(best_match)

        return {"success": True, "matches": final_matches}
        
    except Exception as e:
        if conn: conn.close()
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)