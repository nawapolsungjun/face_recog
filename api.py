from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import face_recognition
import io
import json
import numpy as np
import sqlite3
import base64
from PIL import Image, ImageOps
from PIL import Image, ImageOps, ImageEnhance
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_image_to_np(contents):
    img = Image.open(io.BytesIO(contents))
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')

    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.2) 
    
    # 2. ปรับความคมชัด (Contrast) - ช่วยให้ขอบใบหน้าชัดขึ้น
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.3)
    
    # 3. (ทางเลือก) ปรับความชัดของภาพ (Sharpness)
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.5)
    return np.array(img)

# 1. ลงทะเบียนหลายมุม
@app.post("/api/register-face-multi")
async def register_face_multi(files: List[UploadFile] = File(...)):
    try:
        all_vectors = []
        for file in files:
            contents = await file.read()
            image_np = process_image_to_np(contents)
            encodings = face_recognition.face_encodings(image_np)
            if len(encodings) > 0:
                all_vectors.append(encodings[0].tolist())
        
        if len(all_vectors) > 0:
            return {"success": True, "face_vectors": all_vectors, "vector_count": len(all_vectors)}
        return {"success": False, "error": "AI หาใบหน้าไม่เจอ"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    

@app.post("/api/extract-vector")
async def extract_vector(data: dict):
    try:
        # แปลง Base64 เป็นรูปภาพ
        header, encoded = data['image'].split(",", 1)
        image_data = base64.b64decode(encoded)
        image_np = process_image_to_np(image_data) # ใช้ฟังก์ชันปรับแสงที่บอสมี

        # สกัด Vector
        encodings = face_recognition.face_encodings(image_np)
        if len(encodings) > 0:
            return {"success": True, "vector": encodings[0].tolist()}
        return {"success": False, "error": "ไม่พบใบหน้า"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# 2. เช็คชื่อกลุ่มแยกตามวิชา และป้องกันบันทึกซ้ำซ้อน
# api.py (ปรับปรุงส่วน check_attendance)
@app.post("/api/check-attendance-group")
async def check_attendance(
    file: UploadFile = File(...), 
    course_id: str = Form(...), 
    boxes: str = Form(...) 
):
    conn = None
    try:
        contents = await file.read()
        image_np = process_image_to_np(contents)
        face_boxes_js = json.loads(boxes)
        
        img_h, img_w, _ = image_np.shape
        face_locations = []

        # 🚀 จุดแก้ไขสำคัญ: ปรับพิกัดให้เข้ากับขนาดรูปจริง
        # เราต้องมั่นใจว่าพิกัดที่ส่งมา ถูกนำมาใช้กับรูปขนาดจริงได้ถูกต้อง
        for box in face_boxes_js:
            # face_recognition ใช้รูปแบบ (top, right, bottom, left)
            top = max(0, int(box['y']))
            right = min(img_w, int(box['x'] + box['width']))
            bottom = min(img_h, int(box['y'] + box['height']))
            left = max(0, int(box['x']))
            face_locations.append((top, right, bottom, left))

        if not face_locations:
            print("🔍 DEBUG: No face locations found in request")
            return {"success": True, "matches": []}

        # สกัด Encoding จากพิกัดที่ส่งมา
        current_encodings = face_recognition.face_encodings(image_np, known_face_locations=face_locations)
        print(f"🔍 DEBUG: Found {len(current_encodings)} faces in image")

        # ดึงข้อมูลนักศึกษาจาก DB
        conn = sqlite3.connect('./attendance-web/prisma/dev.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 🚀 ปรับปรุง Query: ดึงเฉพาะนักเรียนที่มีใบหน้าลงทะเบียนไว้
        query = """
            SELECT s.id, s.name, s.faceVectors 
            FROM Student s
            JOIN _CourseToStudent cts ON s.id = cts.B 
            WHERE cts.A = ? AND s.faceVectors IS NOT NULL
        """
        cursor.execute(query, (course_id,))
        students = cursor.fetchall()

        print(f"🔍 DEBUG: ดึงข้อมูลนักเรียนมาเปรียบเทียบ {len(students)} คน สำหรับวิชา {course_id}")

        final_matches = [None] * len(current_encodings)
        
        # วนลูปหาใบหน้าที่ใกล้เคียงที่สุด
        for idx, current_vec in enumerate(current_encodings):
            best_student = None
            lowest_dist = 0.5 # 🚀 ปรับ Tolerance เป็น 0.6 (กลางๆ ไม่หลวมไม่เข้มเกินไป)

            for student in students:
                try:
                    vector_raw = student['faceVectors']
                    data = json.loads(vector_raw)
                    
                    # รองรับทั้งแบบ Vector เดียว และหลายมุม
                    if isinstance(data, list):
                        saved_vectors = [np.array(v) for v in data]
                    else:
                        saved_vectors = [np.array(data)]

                    distances = face_recognition.face_distance(saved_vectors, current_vec)
                    current_min = np.min(distances)

                    if current_min < lowest_dist:
                        lowest_dist = current_min
                        best_student = {"id": student['id'], "name": student['name']}
                except Exception as e:
                    print(f"⚠️ Error parsing vector for student {student['name']}: {e}")
                    continue
            
            if best_student:
                print(f"✅ Match Found: {best_student['name']} (Dist: {lowest_dist:.4f})")
                final_matches[idx] = best_student
            else:
                print(f"❓ Unknown face at index {idx}")

        # ส่งชื่อกลับไปให้ Next.js วาดกรอบ
        display_names = [m['name'] if m else "Unknown" for m in final_matches]
        
        conn.close()
        return {"success": True, "matches": display_names}
        
    except Exception as e:
        print(f"❌ Python Error: {str(e)}")
        if conn: conn.close()
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)