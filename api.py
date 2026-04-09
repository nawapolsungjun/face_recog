from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import face_recognition
import io
import json
import numpy as np
import sqlite3
from PIL import Image, ImageOps

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
    return np.array(img)

# 1. Endpoint สำหรับลงทะเบียนหลายมุมพร้อมกัน
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
            return {
                "success": True, 
                "face_vectors": all_vectors, 
                "vector_count": len(all_vectors)
            }
        
        return {"success": False, "error": "AI หาใบหน้าไม่เจอจากทุกรูปที่ส่งมา"}
    except Exception as e:
        print(f"Error in multi-register: {e}")
        return {"success": False, "error": str(e)}

# 2. ระบบเช็คชื่อกลุ่ม (ป้องกันชื่อซ้ำในรูปเดียวกัน)
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
            top = max(0, int(box['y']))
            right = min(img_w, int(box['x'] + box['width']))
            bottom = min(img_h, int(box['y'] + box['height']))
            left = max(0, int(box['x']))
            face_locations.append((top, right, bottom, left))

        if not face_locations:
            return {"success": True, "matches": []}

        current_encodings = face_recognition.face_encodings(image_np, known_face_locations=face_locations)
        
        conn = sqlite3.connect('./attendance-web/prisma/dev.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name, faceVectors FROM Student")
        students = cursor.fetchall()
        conn.close()

        # เตรียมตัวแปรสำหรับจัดการผลลัพธ์
        final_matches = [None] * len(current_encodings)
        # claimed_faces เก็บชื่อที่ถูกจองแล้ว: { "ชื่อ": {"index": idx, "dist": distance} }
        claimed_faces = {}

        # วนลูปทีละใบหน้าที่เจอในรูป (ใช้ enumerate เพื่อเก็บตำแหน่ง index)
        for idx, current_vec in enumerate(current_encodings):
            best_match_for_this_face = None
            lowest_dist_for_this_face = 0.55  # เกณฑ์ความแม่นยำ

            for student in students:
                name = student['name']
                vector_raw = student['faceVectors']
                if not vector_raw: continue

                try:
                    data = json.loads(vector_raw)
                    # รองรับ Multi-Vector
                    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                        saved_vectors = [np.array(v) for v in data]
                    else:
                        vec = data.get('front', data) if isinstance(data, dict) else data
                        saved_vectors = [np.array(vec)]

                    distances = face_recognition.face_distance(saved_vectors, current_vec)
                    current_min = np.min(distances)

                    if current_min < lowest_dist_for_this_face:
                        lowest_dist_for_this_face = current_min
                        best_match_for_this_face = name
                except:
                    continue
            
            # --- 🚀 เงื่อนไขป้องกันชื่อซ้ำในรูปเดียว ---
            if best_match_for_this_face:
                # ถ้าชื่อนี้เคยถูกใบหน้าอื่นในรูปนี้ "จอง" ไปแล้ว
                if best_match_for_this_face in claimed_faces:
                    # ตรวจสอบว่าใบหน้าปัจจุบัน "ชัดเจน/แม่นยำ" กว่าใบหน้าที่จองไว้เดิมไหม
                    if lowest_dist_for_this_face < claimed_faces[best_match_for_this_face]['dist']:
                        # อันใหม่แม่นกว่า! ยกเลิกอันเก่าให้เป็น None
                        old_idx = claimed_faces[best_match_for_this_face]['index']
                        final_matches[old_idx] = None
                        
                        # จองตำแหน่งใหม่แทน
                        final_matches[idx] = best_match_for_this_face
                        claimed_faces[best_match_for_this_face] = {
                            "index": idx,
                            "dist": lowest_dist_for_this_face
                        }
                    else:
                        # อันใหม่แม่นน้อยกว่าอันที่จองไว้แล้ว ตำแหน่งนี้จึงเป็น None
                        final_matches[idx] = None
                else:
                    # ยังไม่มีใครใช้ชื่อนี้ บันทึกชื่อและจองตำแหน่งทันที
                    final_matches[idx] = best_match_for_this_face
                    claimed_faces[best_match_for_this_face] = {
                        "index": idx,
                        "dist": lowest_dist_for_this_face
                    }
            else:
                final_matches[idx] = None

        return {"success": True, "matches": final_matches}
        
    except Exception as e:
        if conn: conn.close()
        print(f"Group check error: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)