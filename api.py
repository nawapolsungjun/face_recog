from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import io
import json
import numpy as np
import sqlite3
from PIL import Image, ImageOps

app = FastAPI()

# 1. ตั้งค่า CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚀 ฟังก์ชันประมวลผลรูปภาพให้เป็นมาตรฐานเดียวกัน (RGB + No Alpha)
def process_image_to_np(contents):
    img = Image.open(io.BytesIO(contents))
    img = ImageOps.exif_transpose(img) # แก้ปัญหาภาพเอียงจาก Metadata
    
    # มั่นใจว่าเป็น RGB (ป้องกันปัญหาภาพโปร่งแสง หรือภาพ BGR จากบาง Browser)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    img_np = np.array(img)
    print(f"DEBUG: Image processed. Shape: {img_np.shape}, Mode: {img.mode}")
    return img_np

# --- Endpoint สำหรับลงทะเบียน ---
@app.post("/api/register-face")
async def register_face(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image_np = process_image_to_np(contents)
        
        # สกัด Vector (Encoding)
        encodings = face_recognition.face_encodings(image_np)
        
        if len(encodings) > 0:
            face_vector = encodings[0].tolist()
            print(f"DEBUG: Register Success. Vector Length: {len(face_vector)}")
            return {"success": True, "face_vector": face_vector}
        
        return {"success": False, "error": "ไม่พบใบหน้าในขณะลงทะเบียน"}
    except Exception as e:
        print(f"❌ Register Error: {e}")
        return {"success": False, "error": str(e)}

# --- 🚀 Endpoint สำหรับเช็คชื่อกลุ่ม (Enhanced Version) ---
@app.post("/api/check-attendance-group")
async def check_attendance_group(
    file: UploadFile = File(...),
    boxes: str = Form(...)
):
    try:
        contents = await file.read()
        image_np = process_image_to_np(contents)
        img_h, img_w, _ = image_np.shape

        face_boxes_js = json.loads(boxes)
        face_locations = []
        
        # ปรับจูนพิกัดให้ปลอดภัย
        for box in face_boxes_js:
            left = max(0, int(box['x']))
            top = max(0, int(box['y']))
            right = min(img_w, int(box['x'] + box['width']))
            bottom = min(img_h, int(box['y'] + box['height']))
            face_locations.append((top, right, bottom, left))

        if not face_locations:
            return {"success": True, "matches": []}

        # สกัด Vector จากพิกัดที่ส่งมา
        current_encodings = face_recognition.face_encodings(image_np, known_face_locations=face_locations)
        
        # ดึงข้อมูลจาก Database
        conn = sqlite3.connect('./attendance-web/prisma/dev.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name, faceVectors FROM Student")
        students = cursor.fetchall()
        conn.close()

        final_matches = []
        
        students = cursor.fetchall()
        print(f"DEBUG: ดึงข้อมูลนักศึกษาจาก DB ได้ทั้งหมด {len(students)} คน") # 🚀 เพิ่มบรรทัดนี้
        conn.close()
        # วนลูปตรวจสอบทีละใบหน้าที่ตรวจเจอ
        for i, current_vec in enumerate(current_encodings):
            best_match = None
            min_distance = 0.60 # เกณฑ์มาตรฐาน
            
            print(f"\n🔍 --- วิเคราะห์ใบหน้าที่ {i+1} ---")
            print(f"Current Vector (First 5 values): {current_vec[:5]}")

            for student in students:
                name = student['name']
                vector_raw = student['faceVectors']
                if not vector_raw: continue

                try:
                    # 🚀 ระบบแกะ JSON แบบทนทาน (Safe JSON Parsing)
                    data = json.loads(vector_raw)
                    while isinstance(data, str):
                        data = json.loads(data)
                    
                    if isinstance(data, dict):
                        saved_vec_list = data.get('front', data.get('vector', []))
                    else:
                        saved_vec_list = data
                    
                    saved_vec = np.array(saved_vec_list, dtype=float)

                    # ตรวจสอบขนาดของ Vector (ต้องเป็น 128 มิติ)
                    if len(saved_vec) != len(current_vec):
                        print(f"⚠️ ขนาด Vector ไม่ตรงกัน: DB({len(saved_vec)}) vs Current({len(current_vec)})")
                        continue

                    # 🚀 คำนวณค่าความต่าง (Distance)
                    distance = face_recognition.face_distance([saved_vec], current_vec)[0]
                    
                    # Print ข้อมูลเปรียบเทียบ
                    print(f"👤 เทียบกับ: {name}")
                    print(f"   DB Vector (First 5): {saved_vec[:5]}")
                    print(f"   ค่าความต่าง (Distance): {distance:.4f}")

                    if distance < min_distance:
                        min_distance = distance
                        best_match = name
                except Exception as parse_err:
                    print(f"❌ Error parsing vector for {name}: {parse_err}")
                    continue
            
            final_matches.append(best_match)
            print(f"🏆 ผลสรุปใบหน้าที่ {i+1}: {best_match if best_match else 'ไม่พบรายชื่อ'}")

        return {"success": True, "matches": final_matches}
        
    except Exception as e:
        print(f"❌ Critical Error: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)