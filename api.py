from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
from pathlib import Path
import io
import json
import numpy as np
import sqlite3
import base64
from PIL import Image, ImageOps, ImageEnhance

app = FastAPI(title="Face Attendance API")

# 1. CORS Configuration
# หมายเหตุ: เมื่อใช้ allow_origins=["*"] จะต้องตั้ง allow_credentials=False ตามข้อกำหนดของ Browser CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://face-recog-nu.vercel.app",
        "http://localhost:3000",
        "*"  # หรือใส่ * เพื่ออนุญาตทุกโดเมนชั่วคราว
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. ฟังก์ชันค้นหา Database Path อัตโนมัติ
def get_db_connection():
    possible_paths = [
        Path("./attendance-web/prisma/dev.db"),
        Path("./prisma/dev.db"),
        Path("/app/attendance-web/prisma/dev.db"),
        Path("/app/dev.db"),
        Path("./dev.db")
    ]
    db_path = None
    for p in possible_paths:
        if p.exists():
            db_path = p
            break
            
    if not db_path:
        db_path = Path("./dev.db")
        
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn

# 3. Health Check Endpoints สำหรับ Render
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Face Recognition API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

def process_image_to_np(contents):
    img = Image.open(io.BytesIO(contents))
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')
    
    # Preprocessing เพิ่มความคมชัด
    img = ImageOps.autocontrast(img, cutoff=0.5)
    img = ImageEnhance.Brightness(img).enhance(1.1)
    img = ImageEnhance.Contrast(img).enhance(1.2)
    img = ImageEnhance.Sharpness(img).enhance(1.5)
    return np.array(img)

@app.post("/api/register-face-multi")
async def register_face_multi(files: List[UploadFile] = File(...)):
    import face_recognition  # Lazy import เพื่อเลี่ยง OOM ตอน Boot
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
    import face_recognition  # Lazy import
    try:
        header, encoded = data['image'].split(",", 1)
        image_data = base64.b64decode(encoded)
        image_np = process_image_to_np(image_data)
        encodings = face_recognition.face_encodings(image_np)
        if len(encodings) > 0:
            return {"success": True, "vector": encodings[0].tolist()}
        return {"success": False, "error": "ไม่พบใบหน้า"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/check-attendance-group")
async def check_attendance(
    file: UploadFile = File(...), 
    course_id: str = Form(...), 
    boxes: str = Form(...) 
):
    import face_recognition  # Lazy import
    conn = None
    try:
        contents = await file.read()
        image_np = process_image_to_np(contents)
        face_boxes_js = json.loads(boxes)
        
        img_h, img_w, _ = image_np.shape
        face_locations = []

        for box in face_boxes_js:
            top = max(0, int(box['y']))
            right = min(img_w, int(box['x'] + box['width']))
            bottom = min(img_h, int(box['y'] + box['height']))
            left = max(0, int(box['x']))
            face_locations.append((top, right, bottom, left))

        if not face_locations:
            return {"success": True, "matches": []}

        current_encodings = face_recognition.face_encodings(image_np, known_face_locations=face_locations)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT s.id, s.firstName, s.lastName, s.faceVectors 
            FROM Student s
            JOIN _CourseToStudent cts ON s.id = cts.B 
            WHERE cts.A = ? AND s.faceVectors IS NOT NULL
        """
        cursor.execute(query, (course_id,))
        raw_students = cursor.fetchall()

        students = []
        for s in raw_students:
            f_name = s['firstName'] or ""
            l_name = s['lastName'] or ""
            full_name = f"{f_name} {l_name}".strip() or "ไม่ระบุชื่อ"
            students.append({
                "id": s['id'],
                "name": full_name,
                "faceVectors": s['faceVectors']
            })

        final_matches = [None] * len(current_encodings)
        match_distances = [1.0] * len(current_encodings)

        # 1. คำนวณระยะห่างใบหน้าที่ใกล้เคียงที่สุด
        for idx, current_vec in enumerate(current_encodings):
            best_student = None
            lowest_dist = 0.52

            for student in students:
                try:
                    vector_raw = student['faceVectors']
                    data = json.loads(vector_raw)
                    saved_vectors = [np.array(v) for v in data] if isinstance(data, list) else [np.array(data)]

                    distances = face_recognition.face_distance(saved_vectors, current_vec)
                    current_min = float(np.min(distances))

                    if current_min < lowest_dist:
                        lowest_dist = current_min
                        best_student = {"id": student['id'], "name": student['name']}
                except Exception:
                    continue
            
            if best_student:
                final_matches[idx] = best_student
                match_distances[idx] = lowest_dist

        # 2. De-duplication ป้องกันการตรวจจับชื่อซ้ำในภาพเดียวกัน
        used_names = {}

        for idx, student in enumerate(final_matches):
            if student:
                name = student['name']
                dist = match_distances[idx]

                if name in used_names:
                    if dist < used_names[name]['dist']:
                        final_matches[used_names[name]['index']] = None
                        used_names[name] = {"index": idx, "dist": dist}
                    else:
                        final_matches[idx] = None
                else:
                    used_names[name] = {"index": idx, "dist": dist}

        display_names = [m['name'] if m else "Unknown" for m in final_matches]
        
        conn.close()
        return {"success": True, "matches": display_names}
        
    except Exception as e:
        print(f"Python Error: {str(e)}")
        if conn: conn.close()
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, workers=1)