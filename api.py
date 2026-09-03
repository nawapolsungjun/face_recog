from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import os
from pathlib import Path
import io
import json
import numpy as np
import sqlite3
import base64
import gc
from PIL import Image, ImageOps, ImageEnhance

app = FastAPI(title="Face Attendance API")

# 1. CORS Configuration ที่ถูกต้องตามมาตรฐานเบราว์เซอร์
origins = [
    "https://face-recog-nu.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # รองรับทุก Preview deployment บน Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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

# ปรับให้รับทั้ง GET และ HEAD
@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"status": "ok", "message": "Face Recognition API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

def process_image_to_np(contents):
    img = Image.open(io.BytesIO(contents))
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')
    
    # [จุดสำคัญ]: ย่อขนาดรูปภาพไม่ให้เกิน 600px ลดการใช้ RAM ป้องกัน Render ล่ม
    img.thumbnail((600, 600), Image.Resampling.LANCZOS)
    
    # Preprocessing เพิ่มความคมชัด
    img = ImageOps.autocontrast(img, cutoff=0.5)
    img = ImageEnhance.Brightness(img).enhance(1.1)
    img = ImageEnhance.Contrast(img).enhance(1.2)
    img = ImageEnhance.Sharpness(img).enhance(1.5)
    return np.array(img)

@app.post("/api/register-face-multi")
async def register_face_multi(files: List[UploadFile] = File(...)):
    import face_recognition  # Lazy import เพื่อเลี่ยง OOM ตอน Boot
    all_vectors = []
    errors = []

    try:
        for index, file in enumerate(files):
            try:
                contents = await file.read()
                if not contents:
                    continue
                
                image_np = process_image_to_np(contents)
                encodings = face_recognition.face_encodings(image_np)
                
                if len(encodings) > 0:
                    all_vectors.append(encodings[0].tolist())
                else:
                    errors.append(f"รูปที่ {index + 1}: ไม่พบใบหน้า")
                
                # ล้าง Memory ทันทีในแต่ละรูป
                del contents
                del image_np
                gc.collect()

            except Exception as img_err:
                errors.append(f"รูปที่ {index + 1}: {str(img_err)}")

        if len(all_vectors) > 0:
            return {
                "success": True, 
                "face_vectors": all_vectors, 
                "vector_count": len(all_vectors),
                "warnings": errors
            }
        
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "ไม่พบใบหน้าจากรูปที่ส่งมา", "details": errors}
        )
    except Exception as e:
        print(f"Error in register_face_multi: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/api/extract-vector")
async def extract_vector(data: dict):
    import face_recognition  # Lazy import
    try:
        header, encoded = data['image'].split(",", 1)
        image_data = base64.b64decode(encoded)
        image_np = process_image_to_np(image_data)
        encodings = face_recognition.face_encodings(image_np)
        
        del image_data
        del image_np
        gc.collect()

        if len(encodings) > 0:
            return {"success": True, "vector": encodings[0].tolist()}
        return {"success": False, "error": "ไม่พบใบหน้า"}
    except Exception as e:
        print(f"Error in extract_vector: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

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
            del contents
            del image_np
            gc.collect()
            return {"success": True, "matches": []}

        current_encodings = face_recognition.face_encodings(image_np, known_face_locations=face_locations)
        
        # คืน Memory ภาพทันทีเมื่อสกัด Vector เสร็จ
        del contents
        del image_np
        gc.collect()
        
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
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    # ปรับชื่อโมดูลให้ตรงกับชื่อไฟล์ของคุณ (เช่น api:app หรือ main:app)
    uvicorn.run(app, host="0.0.0.0", port=port, workers=1)