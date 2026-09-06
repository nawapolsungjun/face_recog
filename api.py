import os
import gc
import io
import json
import base64
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import numpy as np
import face_recognition
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(title="Face Recognition AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL)

def get_students_vectors_by_course(course_id: str):
    """
    ดึงข้อมูลเวกเตอร์ใบหน้าของนักศึกษาในรายวิชาจาก Database
    (ปรับชื่อ Table/Column ให้ตรงกับ Schema ใน Prisma ได้)
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    known_students = []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Query นักศึกษาที่อยู่ใน Course และมี Face Vectors
            query = """
                SELECT s.id, s."studentCode", s."firstName", s."lastName", s."name", s."faceVectors"
                FROM "Student" s
                JOIN "_CourseToStudent" cs ON cs."B" = s.id
                WHERE cs."A" = %s AND s."faceVectors" IS NOT NULL
            """
            cur.execute(query, (course_id,))
            rows = cur.fetchall()

            for row in rows:
                raw_vectors = row.get("faceVectors")
                if not raw_vectors:
                    continue
                
                # รองรับทั้งรูปแบบ String JSON และ List
                vectors = json.loads(raw_vectors) if isinstance(raw_vectors, str) else raw_vectors
                display_name = f"{row.get('firstName') or ''} {row.get('lastName') or ''}".strip() or row.get("name") or row.get("studentCode")
                
                for vec in vectors:
                    known_students.append({
                        "name": display_name,
                        "student_code": row.get("studentCode"),
                        "vector": np.array(vec, dtype=np.float64)
                    })
    except Exception as e:
        print(f"Database query error: {e}")
    finally:
        conn.close()

    return known_students

class ImageBase64Request(BaseModel):
    image: str

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Face Recognition API"}

# -------------------------------------------------------------------
# 1. สกัดเวกเตอร์ทีละรูปจาก Webcam (Single Shot Base64)
# -------------------------------------------------------------------
@app.post("/api/extract-vector")
async def extract_vector(payload: ImageBase64Request):
    pil_img = None
    rgb_img = None
    try:
        header, encoded = payload.image.split(",", 1) if "," in payload.image else ("", payload.image)
        image_data = base64.b64decode(encoded)
        pil_img = Image.open(io.BytesIO(image_data)).convert("RGB")
        rgb_img = np.array(pil_img)

        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            return {"success": False, "message": "ไม่พบใบหน้าในภาพ"}

        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if not face_encodings:
            return {"success": False, "message": "ไม่สามารถสกัดเวกเตอร์ใบหน้าได้"}

        return {"success": True, "vector": face_encodings[0].tolist()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        del pil_img
        del rgb_img
        gc.collect()

# -------------------------------------------------------------------
# 2. ลงทะเบียนใบหน้าหลายรูป (Multi-Upload)
# -------------------------------------------------------------------
@app.post("/api/register-face-multi")
async def register_face_multi(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="ไม่พบไฟล์รูปภาพ")

    face_vectors = []

    for file in files:
        pil_img = None
        rgb_img = None
        try:
            image_bytes = await file.read()
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            rgb_img = np.array(pil_img)

            face_locations = face_recognition.face_locations(rgb_img, model="hog")
            if not face_locations:
                h, w, _ = rgb_img.shape
                face_locations = [(0, w, h, 0)]

            encodings = face_recognition.face_encodings(rgb_img, face_locations)
            if encodings:
                face_vectors.append(encodings[0].tolist())

        except Exception as err:
            print(f"Error processing {file.filename}: {err}")
        finally:
            del pil_img
            del rgb_img
            gc.collect()

    if not face_vectors:
        return {"success": False, "message": "ไม่สามารถสกัดเวกเตอร์ใบหน้าได้"}

    return {
        "success": True,
        "message": f"สกัดข้อมูลใบหน้าสำเร็จ {len(face_vectors)} รูป",
        "face_vectors": face_vectors
    }

# -------------------------------------------------------------------
# 3. เช็คชื่อจากภาพถ่ายกลุ่ม (Group Attendance Verification)
# -------------------------------------------------------------------
@app.post("/api/check-attendance-group")
async def check_attendance_group(
    file: UploadFile = File(...),
    boxes: str = Form(...),
    course_id: str = Form(...)
):
    pil_img = None
    rgb_img = None
    try:
        # 1. โหลดรูปภาพ
        image_bytes = await file.read()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        rgb_img = np.array(pil_img)

        # 2. ดึงเวกเตอร์นักศึกษาในวิชา
        known_students = get_students_vectors_by_course(course_id)
        known_vectors = [s["vector"] for s in known_students]

        # 3. แปลง Bounding Box จาก Frontend [{x, y, width, height}, ...]
        # เป็นรูปแบบ face_recognition: (top, right, bottom, left)
        parsed_boxes = json.loads(boxes)
        face_locations = []
        for b in parsed_boxes:
            top = max(0, int(b["y"]))
            right = min(rgb_img.shape[1], int(b["x"] + b["width"]))
            bottom = min(rgb_img.shape[0], int(b["y"] + b["height"]))
            left = max(0, int(b["x"]))
            face_locations.append((top, right, bottom, left))

        matches = []
        tolerance = 0.50  # ค่ายิ่งน้อย ยิ่งเข้มงวด ป้องกันการทายผิดคน

        # 4. สกัดเวกเตอร์ทีละกรอบใบหน้า เพื่อจำกัด Memory Spike
        for loc in face_locations:
            enc = face_recognition.face_encodings(rgb_img, known_face_locations=[loc], num_jitters=1)
            
            if not enc or len(known_vectors) == 0:
                matches.append("Unknown")
                continue

            current_vec = enc[0]
            # คำนวณระยะห่าง Euclidean Distance
            distances = face_recognition.face_distance(known_vectors, current_vec)
            best_match_idx = int(np.argmin(distances))

            if distances[best_match_idx] <= tolerance:
                matches.append(known_students[best_match_idx]["name"])
            else:
                matches.append("Unknown")

        return {
            "success": True,
            "matches": matches,
            "total_detected": len(matches)
        }

    except Exception as e:
        print(f"Error in check_attendance_group: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        del pil_img
        del rgb_img
        gc.collect()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)